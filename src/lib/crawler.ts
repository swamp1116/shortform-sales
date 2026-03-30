import { chromium, type Page, type Frame } from "playwright";

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

const SEARCH_KEYWORDS = [
  "서울 음식점",
  "서울 카페",
  "서울 미용실",
  "서울 헬스장",
  "서울 네일샵",
  "서울 학원",
  "서울 병원",
  "서울 치과",
  "서울 동물병원",
  "서울 꽃집",
  "서울 베이커리",
  "서울 요가",
  "서울 필라테스",
  "서울 피부과",
  "서울 성형외과",
  "서울 한의원",
  "서울 안경점",
  "서울 옷가게",
  "서울 인테리어",
  "서울 스튜디오",
];

function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  if (!matches) return null;
  const filtered = matches.filter(
    (e) =>
      !e.includes("example") &&
      !e.includes("test@") &&
      !e.includes("noreply") &&
      !e.includes("no-reply") &&
      !e.includes("naver.com") &&
      !e.includes("help.naver") &&
      !e.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i) &&
      !e.includes("@2x") &&
      !e.includes("@3x")
  );
  return filtered.length > 0 ? filtered[0] : null;
}

async function getDetailInfo(
  entryFrame: Frame
): Promise<{
  address: string;
  phone: string;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
  email: string | null;
}> {
  const result = {
    address: "",
    phone: "",
    website: null as string | null,
    instagram: null as string | null,
    youtube: null as string | null,
    email: null as string | null,
  };

  try {
    // 주소 - 여러 셀렉터 시도
    for (const sel of [".PkgBl", ".pz7wy", ".LDgIH", ".IH7VR"]) {
      const text = await entryFrame.locator(sel).first().textContent({ timeout: 1500 }).catch(() => null);
      if (text && text.trim().length > 3) {
        result.address = text.trim();
        break;
      }
    }

    // 전화 - 여러 셀렉터 시도
    for (const sel of [".xlx7Q", "a[href^='tel:']", "[class*='phone']", ".place_section_content .txt_tel"]) {
      const text = await entryFrame.locator(sel).first().textContent({ timeout: 1500 }).catch(() => null);
      if (text && text.trim().length > 5) {
        result.phone = text.trim();
        break;
      }
    }

    // 링크 수집 (홈페이지, SNS, 이메일)
    const links = await entryFrame
      .locator("a[href]")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).href).filter((h) => h.startsWith("http"))
      )
      .catch(() => [] as string[]);

    for (const link of links) {
      if (link.includes("instagram.com") && !result.instagram) {
        result.instagram = link;
      } else if ((link.includes("youtube.com") || link.includes("youtu.be")) && !result.youtube) {
        result.youtube = link;
      } else if (
        !result.website &&
        !link.includes("naver.com") &&
        !link.includes("instagram.com") &&
        !link.includes("youtube.com") &&
        !link.includes("facebook.com") &&
        !link.includes("google.com")
      ) {
        result.website = link;
      }
    }

    // 이메일 추출
    const pageText = await entryFrame.locator("body").textContent({ timeout: 2000 }).catch(() => "");
    result.email = extractEmail(pageText || "");
  } catch {
    // 상세 정보 수집 실패해도 계속 진행
  }

  return result;
}

async function scrapeNaverPlace(
  page: Page,
  keyword: string,
  maxResults: number = 50
): Promise<CrawledBusiness[]> {
  const results: CrawledBusiness[] = [];

  try {
    const searchUrl = `https://map.naver.com/p/search/${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2500);

    const searchFrame = page.frame("searchIframe");
    if (!searchFrame) {
      console.log(`  ⚠️ searchIframe 없음 (${keyword})`);
      return results;
    }

    // 리스트 로드 대기
    await searchFrame.locator("li.UEzoS").first().waitFor({ timeout: 5000 }).catch(() => {});

    // 필요한 만큼만 스크롤
    const scrollCount = Math.ceil(maxResults / 10);
    for (let s = 0; s < scrollCount; s++) {
      await searchFrame.evaluate(() => {
        const scrollEl = document.querySelector('[class*="Ryr1F"]') ||
          document.querySelector('[role="list"]')?.parentElement;
        scrollEl?.scrollBy(0, 800);
      }).catch(() => {});
      await page.waitForTimeout(800);
    }

    // 리스트에서 업체명 + 업종 추출
    const listData = await searchFrame.evaluate((max) => {
      const items = document.querySelectorAll("li.UEzoS");
      const data: { name: string; category: string }[] = [];
      for (let i = 0; i < Math.min(items.length, max); i++) {
        const name = items[i].querySelector(".TYaxT")?.textContent?.trim() || "";
        const category = items[i].querySelector(".KCMnt")?.textContent?.trim() || "";
        if (name) data.push({ name, category });
      }
      return data;
    }, maxResults);

    console.log(`  📋 ${keyword}: 리스트 ${listData.length}개 발견`);

    // 각 업체 클릭 → 상세 정보 수집
    for (let i = 0; i < listData.length; i++) {
      try {
        const items = await searchFrame.locator("li.UEzoS").all();
        if (i >= items.length) break;

        await items[i].locator(".TYaxT").click();
        await page.waitForTimeout(1500);

        const entryFrame = page.frame("entryIframe");
        if (!entryFrame) continue;

        // 업체명 로드 대기
        await entryFrame.locator(".GHAhO").waitFor({ timeout: 3000 }).catch(() => {});

        const detail = await getDetailInfo(entryFrame);

        results.push({
          name: listData[i].name,
          category: listData[i].category,
          address: detail.address,
          phone: detail.phone,
          website: detail.website,
          instagram: detail.instagram,
          youtube: detail.youtube,
          email: detail.email,
        });

        console.log(`    ✅ ${i + 1}/${listData.length} ${listData[i].name}`);
      } catch {
        // 실패한 항목도 기본 정보만으로 저장
        results.push({
          name: listData[i].name,
          category: listData[i].category,
          address: "",
          phone: "",
          website: null,
          instagram: null,
          youtube: null,
          email: null,
        });
        console.log(`    ⚠️ ${i + 1}/${listData.length} ${listData[i].name} (상세 실패)`);
      }
    }
  } catch (error) {
    console.error(`Error crawling "${keyword}":`, error);
  }

  return results;
}

export async function crawlBusinesses(
  keywords?: string[],
  maxPerKeyword: number = 50,
  onProgress?: (msg: string) => void
): Promise<CrawledBusiness[]> {
  const searchKeywords = keywords || SEARCH_KEYWORDS;
  const allResults: CrawledBusiness[] = [];
  const seenNames = new Set<string>();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ko-KR",
  });

  const page = await context.newPage();

  for (const keyword of searchKeywords) {
    onProgress?.(`크롤링 중: ${keyword}`);
    console.log(`\n🔍 ${keyword} 크롤링 시작...`);

    const results = await scrapeNaverPlace(page, keyword, maxPerKeyword);

    for (const biz of results) {
      if (!seenNames.has(biz.name)) {
        seenNames.add(biz.name);
        allResults.push(biz);
      }
    }

    const msg = `${keyword}: ${results.length}개 수집 (누적: ${allResults.length}개)`;
    onProgress?.(msg);
    console.log(`  📊 ${msg}`);

    // rate limiting
    await page.waitForTimeout(1000 + Math.random() * 2000);
  }

  await browser.close();
  return allResults;
}
