/**
 * Vercel 서버리스용 경량 크롤러
 * 네이버 통합검색 HTML에서 업체 데이터 파싱
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
  // 뷰티/코스메틱
  "서울 화장품 브랜드", "서울 스킨케어 브랜드", "서울 뷰티 스타트업",
  "강남 피부관리", "청담 뷰티샵", "서울 메이크업 스튜디오",
  "강남 속눈썹", "서울 왁싱샵", "서울 네일아트", "강남 헤어살롱",
  // 병원/의원
  "서울 피부과", "강남 성형외과", "서울 치과 의원",
  "강남 안과", "서울 한의원", "강남 정형외과",
  // 헬스/피트니스
  "서울 PT샵", "서울 필라테스 스튜디오", "서울 요가 스튜디오",
  "강남 피트니스", "서울 크로스핏", "강남 복싱장",
  "홍대 필라테스", "잠실 헬스장",
  // 교육/학원
  "강남 어학원", "서울 코딩 학원", "강남 보컬학원",
  "서울 입시미술학원", "대치동 영어학원", "강남 수학학원",
  "서울 댄스학원", "강남 음악학원", "서울 유학원",
  // 엔터/기획사
  "서울 연예기획사", "서울 음악 레이블", "서울 MCN 기업",
  "서울 영상 프로덕션", "서울 광고 대행사", "서울 마케팅 대행사",
  // 게임
  "서울 게임 스타트업", "서울 보드게임카페", "강남 방탈출카페",
  // 기타
  "서울 동물병원", "강남 동물병원", "서울 애견미용",
  "서울 꽃집", "서울 인테리어", "서울 사진스튜디오",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

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

interface PlaceData {
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  phone: string | null;
  virtualPhone: string | null;
  homePage: string | null;
  id: string;
}

function parsePlacesFromHtml(html: string): PlaceData[] {
  const places: PlaceData[] = [];

  // JSON 내 업체 데이터 패턴 매칭
  const namePattern = /"name":"([^"]+)","businessCategory":"[^"]*","category":"([^"]*)","description":[^,]*,"hasBooking":[^,]*,"hasNPay":[^,]*,"x":"[^"]*","y":"[^"]*","distance":"[^"]*","imageUrl":[^,]*,"imageCount":[^,]*,"phone":(null|"([^"]*)"|null),"virtualPhone":(null|"([^"]*)")/g;

  let match;
  while ((match = namePattern.exec(html)) !== null) {
    places.push({
      name: match[1],
      category: match[2],
      address: "",
      roadAddress: "",
      phone: match[4] || null,
      virtualPhone: match[6] || null,
      homePage: null,
      id: "",
    });
  }

  // 주소 추출 (별도 패턴)
  const addresses = html.match(/"address":"([^"]+)"/g) || [];
  const roadAddresses = html.match(/"roadAddress":"([^"]+)"/g) || [];

  // 업체명과 연관된 주소 매핑 (순서 기반)
  // 처음 몇 개는 지역 주소이므로 skip
  const bizAddresses = addresses
    .map(a => a.replace(/"address":"/, "").replace(/"$/, ""))
    .filter(a => !a.includes("특별시") && !a.includes("광역시") && a.length < 50);

  const bizRoadAddresses = roadAddresses
    .map(a => a.replace(/"roadAddress":"/, "").replace(/"$/, ""))
    .filter(a => a.length < 80);

  for (let i = 0; i < places.length; i++) {
    if (i < bizAddresses.length) places[i].address = bizAddresses[i];
    if (i < bizRoadAddresses.length) places[i].roadAddress = bizRoadAddresses[i];
  }

  return places;
}

async function searchNaver(keyword: string): Promise<CrawledBusiness[]> {
  try {
    const url = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];

    const html = await res.text();
    const places = parsePlacesFromHtml(html);

    return places.map(p => ({
      name: p.name,
      category: p.category,
      address: p.roadAddress || p.address,
      phone: p.virtualPhone || p.phone || "",
      website: p.homePage,
      instagram: null,
      youtube: null,
      email: extractEmail(html),
    }));
  } catch {
    return [];
  }
}

export async function crawlLite(
  keywordCount: number = 5,
  maxPerKeyword: number = 30,
  onProgress?: (msg: string) => void,
  options?: { fast?: boolean }
): Promise<CrawledBusiness[]> {
  // 랜덤 키워드 선택
  const shuffled = [...KEYWORDS].sort(() => Math.random() - 0.5);
  const selectedKeywords = shuffled.slice(0, keywordCount);

  const allResults: CrawledBusiness[] = [];
  const seenNames = new Set<string>();

  for (const keyword of selectedKeywords) {
    onProgress?.(`크롤링: ${keyword}`);

    const places = await searchNaver(keyword);

    for (const place of places) {
      if (!place.name || seenNames.has(place.name)) continue;
      seenNames.add(place.name);
      allResults.push(place);
      if (allResults.length >= keywordCount * maxPerKeyword) break;
    }

    onProgress?.(`${keyword}: ${places.length}개 → 누적 ${allResults.length}개`);

    // 키워드 간 딜레이
    await new Promise(r => setTimeout(r, options?.fast ? 300 : 800));
  }

  return allResults;
}
