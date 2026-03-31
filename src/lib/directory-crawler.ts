/**
 * 업종별 협회/디렉토리 + 구글 검색 기반 이메일 수집
 * 이메일이 공개된 회사 홈페이지에서 직접 추출
 */

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

export type CompanyInfo = {
  name: string;
  category: string;
  website: string | null;
  email: string | null;
  address: string;
  phone: string;
  source: string;
};

// === 이메일 추출 유틸 ===

const BLOCKED_EMAILS = [
  /example\./i, /test@/i, /noreply/i, /no-reply/i,
  /naver\.com$/i, /google\.com$/i, /facebook\.com$/i,
  /instagram\.com$/i, /youtube\.com$/i, /apple\.com$/i,
  /microsoft\.com$/i, /github\.com$/i, /w3\.org/i,
  /schema\.org/i, /cloudflare/i, /googleapis/i,
  /sentry/i, /wix/i, /wordpress\.com/i, /jquery/i,
  /bootstrap/i, /fontawesome/i, /cdn\./i,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i,
  /@2x\./i, /@3x\./i,
];

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return Array.from(new Set(matches)).filter((email) => {
    if (email.length > 60 || email.length < 6) return false;
    if (BLOCKED_EMAILS.some((p) => p.test(email))) return false;
    const [local, domain] = email.split("@");
    if (!local || local.length < 2 || !domain || !domain.includes(".")) return false;
    return true;
  });
}

async function fetchHtml(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function extractEmailFromSite(url: string): Promise<string | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  let emails = extractEmails(html);
  if (emails.length > 0) return emails[0];

  // /contact, /about 페이지 시도
  try {
    const base = new URL(url).origin;
    for (const path of ["/contact", "/about", "/company", "/contact-us", "/about-us"]) {
      const contactHtml = await fetchHtml(base + path);
      if (contactHtml) {
        emails = extractEmails(contactHtml);
        if (emails.length > 0) return emails[0];
      }
    }
  } catch { /* skip */ }
  return null;
}

// === 구글 검색 기반 회사 + 이메일 수집 ===

const GOOGLE_QUERIES: Record<string, string[]> = {
  "뷰티/코스메틱": [
    "서울 뷰티 브랜드 공식 홈페이지 이메일",
    "서울 화장품 회사 contact email",
    "K-beauty brand Seoul email contact",
    "서울 스킨케어 브랜드 문의",
    "한국 코스메틱 스타트업 연락처",
    "서울 뷰티 기업 채용 이메일",
    "강남 에스테틱 예약 이메일",
    "서울 화장품 OEM 업체 이메일",
  ],
  "병원/의원": [
    "강남 성형외과 이메일 상담",
    "서울 피부과 온라인 상담 이메일",
    "강남 치과 예약 이메일",
    "Seoul clinic email consultation",
    "강남 의원 contact email",
    "서울 병원 해외 환자 이메일",
  ],
  "헬스/피트니스": [
    "서울 PT 스튜디오 문의 이메일",
    "서울 필라테스 스튜디오 예약 이메일",
    "강남 피트니스 제휴 문의",
    "서울 요가 스튜디오 contact",
    "서울 크로스핏 박스 이메일",
  ],
  "교육/학원": [
    "서울 코딩 부트캠프 이메일",
    "강남 영어학원 문의 이메일",
    "서울 온라인 교육 스타트업 contact",
    "서울 에듀테크 기업 이메일",
    "강남 입시학원 상담 이메일",
  ],
  "엔터/기획사": [
    "서울 엔터테인먼트 기획사 이메일",
    "한국 MCN 기업 연락처 이메일",
    "서울 영상 제작사 contact email",
    "한국 음악 레이블 이메일",
    "서울 광고 대행사 제휴 이메일",
    "서울 인플루언서 마케팅 회사 이메일",
  ],
  "게임": [
    "서울 게임 회사 채용 이메일",
    "한국 인디게임 개발사 contact",
    "서울 게임 스타트업 이메일",
    "Korea game company email contact",
    "한국 모바일게임 회사 연락처",
  ],
};

interface SearchResult {
  name: string;
  url: string;
  email: string | null;
}

async function googleSearch(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=ko`;
    const html = await fetchHtml(url);
    if (!html) return results;

    // 검색 결과에서 이메일 직접 추출
    const pageEmails = extractEmails(html);

    // 검색 결과에서 URL 추출
    const urlPattern = /https?:\/\/(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,})(?:\/[^\s"<>&]*)?/g;
    const urlMatches = Array.from(html.matchAll(urlPattern));

    const skipDomains = [
      "google.", "naver.", "daum.", "kakao.", "youtube.", "instagram.",
      "facebook.", "twitter.", "tiktok.", "wikipedia.", "namu.wiki",
      "tistory.", "blog.", "kin.", "schema.org", "w3.org", "gstatic.",
      "googleapis.", "apple.", "microsoft.", "github.", "linkedin.",
      "pinterest.", "amazon.", "play.google",
    ];

    const seenDomains = new Set<string>();
    for (const m of urlMatches) {
      const domain = m[1];
      const fullUrl = m[0].split('"')[0].split("&amp;")[0];

      if (skipDomains.some((d) => domain.includes(d))) continue;
      if (seenDomains.has(domain)) continue;
      seenDomains.add(domain);

      // 도메인에서 회사명 추출
      const name = domain.split(".")[0].replace(/-/g, " ");
      const relatedEmail = pageEmails.find((e) => e.includes(domain.split(".")[0]));

      results.push({
        name,
        url: fullUrl.startsWith("http") ? fullUrl : `https://${fullUrl}`,
        email: relatedEmail || null,
      });
    }
  } catch { /* skip */ }
  return results;
}

// === 협회 디렉토리 크롤링 ===

const ASSOCIATION_URLS = [
  {
    name: "한국게임산업협회",
    category: "게임",
    urls: [
      "https://www.kgames.or.kr/",
      "https://www.gamek.or.kr/",
    ],
  },
  {
    name: "한국MCN협회",
    category: "엔터/기획사",
    urls: [
      "https://www.kmcna.or.kr/",
    ],
  },
  {
    name: "대한화장품산업연구원",
    category: "뷰티/코스메틱",
    urls: [
      "https://www.kcii.re.kr/",
    ],
  },
];

async function crawlAssociation(assoc: typeof ASSOCIATION_URLS[0]): Promise<CompanyInfo[]> {
  const results: CompanyInfo[] = [];

  for (const url of assoc.urls) {
    const html = await fetchHtml(url);
    if (!html) continue;

    // 이메일 추출
    const emails = extractEmails(html);
    // 회원사 목록에서 이름+URL 추출 시도
    const linkPattern = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    const links = Array.from(html.matchAll(linkPattern));

    for (const link of links) {
      const linkUrl = link[1];
      const linkName = link[2].trim();

      // 외부 링크만 (내부 링크 제외)
      if (linkUrl.includes(new URL(url).hostname)) continue;
      if (linkName.length < 2 || linkName.length > 50) continue;

      results.push({
        name: linkName,
        category: assoc.category,
        website: linkUrl,
        email: null,
        address: "서울",
        phone: "",
        source: assoc.name,
      });
    }

    // 페이지에서 찾은 이메일도 추가
    if (emails.length > 0) {
      results.push({
        name: assoc.name,
        category: assoc.category,
        website: url,
        email: emails[0],
        address: "서울",
        phone: "",
        source: "협회",
      });
    }
  }

  return results;
}

// === 메인 수집 함수 ===

export async function collectFromDirectories(
  onProgress?: (msg: string) => void
): Promise<CompanyInfo[]> {
  const allResults: CompanyInfo[] = [];
  const seenNames = new Set<string>();

  // 1. 구글 검색 기반 수집
  for (const [category, queries] of Object.entries(GOOGLE_QUERIES)) {
    onProgress?.(`[${category}] 구글 검색 시작...`);

    for (const query of queries) {
      const searchResults = await googleSearch(query);

      for (const sr of searchResults) {
        if (seenNames.has(sr.name) || sr.name.length < 2) continue;
        seenNames.add(sr.name);

        // 홈페이지에서 이메일 추출
        let email = sr.email;
        if (!email) {
          email = await extractEmailFromSite(sr.url);
        }

        if (email) {
          allResults.push({
            name: sr.name,
            category,
            website: sr.url,
            email,
            address: "서울",
            phone: "",
            source: "google",
          });
          onProgress?.(`  ✉️ ${sr.name} → ${email}`);
        }
      }

      // rate limiting
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
    }

    onProgress?.(`[${category}] 완료: ${allResults.filter((r) => r.category === category).length}개 이메일`);
  }

  // 2. 협회 디렉토리
  onProgress?.("\n협회 디렉토리 수집...");
  for (const assoc of ASSOCIATION_URLS) {
    const results = await crawlAssociation(assoc);
    for (const r of results) {
      if (seenNames.has(r.name)) continue;
      seenNames.add(r.name);

      if (!r.email && r.website) {
        r.email = await extractEmailFromSite(r.website);
      }

      if (r.email) {
        allResults.push(r);
        onProgress?.(`  ✉️ ${r.name} → ${r.email} (${r.source})`);
      }
    }
  }

  return allResults;
}
