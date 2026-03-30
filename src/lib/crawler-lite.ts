/**
 * Vercel 서버리스용 경량 크롤러
 * Playwright 대신 네이버 내부 API를 fetch로 호출
 */

export type CrawledBusiness = {
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
  email: string | null;
};

const KEYWORDS = [
  "강남 맛집", "홍대 맛집", "신촌 맛집", "이태원 맛집", "종로 맛집",
  "마포 음식점", "송파 음식점", "성수동 맛집", "잠실 맛집", "건대 맛집",
  "강남 카페", "홍대 카페", "연남동 카페", "성수동 카페", "합정 카페",
  "이태원 카페", "삼청동 카페", "을지로 카페", "서촌 카페", "망원동 카페",
  "강남 미용실", "홍대 미용실", "신사동 미용실", "청담 미용실",
  "강남 네일", "홍대 네일", "신촌 네일",
  "강남 피부관리", "청담 피부관리",
  "강남 헬스장", "홍대 헬스장", "신촌 헬스장", "잠실 헬스장",
  "강남 필라테스", "홍대 필라테스", "마포 요가",
  "강남 치과", "강남 피부과", "강남 성형외과", "강남 한의원",
  "신촌 치과", "종로 한의원",
  "강남 학원", "대치동 학원", "목동 학원", "노원 학원",
  "서울 동물병원", "강남 동물병원", "서울 애견미용",
  "서울 꽃집", "서울 인테리어", "서울 사진스튜디오",
  "강남 옷가게", "서울 베이커리", "서울 디저트",
  "강남 고기집", "홍대 브런치", "이태원 레스토랑",
  "서울 일식", "서울 중식", "서울 양식",
  "서울 안경점", "서울 세탁소",
];

function extractEmail(text: string): string | null {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return null;
  const filtered = matches.filter(
    (e) =>
      !e.includes("example") && !e.includes("test@") &&
      !e.includes("noreply") && !e.includes("no-reply") &&
      !e.includes("naver.com") &&
      !e.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i) &&
      !e.includes("@2x") && !e.includes("@3x")
  );
  return filtered.length > 0 ? filtered[0] : null;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://map.naver.com/",
};

async function searchPlaces(keyword: string, start: number = 1, display: number = 50): Promise<any[]> {
  try {
    const url = `https://map.naver.com/p/api/search/allSearch?query=${encodeURIComponent(keyword)}&type=all&searchCoord=126.9783882%3B37.5666103&page=${start}&displayCount=${display}&isPlaceRecommendationReplace=true&lang=ko`;

    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];

    const data = await res.json();
    const placeList = data?.result?.place?.list || [];
    return placeList;
  } catch {
    return [];
  }
}

async function getPlaceDetail(placeId: string): Promise<{
  phone: string; website: string | null; instagram: string | null;
  youtube: string | null; email: string | null;
}> {
  const result = { phone: "", website: null as string | null, instagram: null as string | null, youtube: null as string | null, email: null as string | null };

  try {
    const url = `https://pcmap.place.naver.com/place/${placeId}/home?entry=bmp`;
    const res = await fetch(url, {
      headers: { ...HEADERS, "Accept": "text/html" },
    });
    if (!res.ok) return result;

    const html = await res.text();

    // 전화번호
    const phoneMatch = html.match(/"phone":"([^"]+)"/);
    if (phoneMatch) result.phone = phoneMatch[1];

    // 홈페이지, SNS
    const urlMatches = html.match(/https?:\/\/[^\s"<>]+/g) || [];
    for (const link of urlMatches) {
      if (link.includes("instagram.com/") && !result.instagram) {
        result.instagram = link.split('"')[0].split("?")[0];
      } else if ((link.includes("youtube.com/") || link.includes("youtu.be/")) && !result.youtube) {
        result.youtube = link.split('"')[0];
      } else if (
        !result.website &&
        !link.includes("naver.com") && !link.includes("instagram.com") &&
        !link.includes("youtube.com") && !link.includes("facebook.com") &&
        !link.includes("google.com") && !link.includes("apple.com") &&
        !link.includes("play.google") && !link.includes(".naver.") &&
        !link.includes("pstatic.net") && !link.includes("ssl.") &&
        link.match(/^https?:\/\/[a-zA-Z0-9]/)
      ) {
        result.website = link.split('"')[0];
      }
    }

    // 이메일
    result.email = extractEmail(html);
  } catch {
    // 상세 페이지 실패해도 계속
  }

  return result;
}

export async function crawlLite(
  keywordCount: number = 5,
  maxPerKeyword: number = 30,
  onProgress?: (msg: string) => void
): Promise<CrawledBusiness[]> {
  // 랜덤 키워드 선택 (매번 다른 키워드 조합)
  const shuffled = [...KEYWORDS].sort(() => Math.random() - 0.5);
  const selectedKeywords = shuffled.slice(0, keywordCount);

  const allResults: CrawledBusiness[] = [];
  const seenNames = new Set<string>();

  for (const keyword of selectedKeywords) {
    onProgress?.(`크롤링: ${keyword}`);

    const places = await searchPlaces(keyword, 1, maxPerKeyword);

    for (const place of places) {
      const name = place.name || place.title || "";
      if (!name || seenNames.has(name)) continue;
      seenNames.add(name);

      const detail = await getPlaceDetail(place.id);

      allResults.push({
        name,
        category: place.category || place.categoryName || "",
        address: place.address || place.roadAddress || "",
        phone: detail.phone || place.tel || "",
        website: detail.website,
        instagram: detail.instagram,
        youtube: detail.youtube,
        email: detail.email,
      });

      // 상세 페이지 간 짧은 딜레이
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    }

    onProgress?.(`${keyword}: ${places.length}개 → 누적 ${allResults.length}개`);

    // 키워드 간 딜레이
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
  }

  return allResults;
}
