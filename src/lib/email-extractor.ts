/**
 * 업체 웹사이트/인스타그램에서 실제 이메일 주소 추출
 * 가짜 이메일 생성 절대 금지 - 실제 확인된 이메일만 반환
 */

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

const BLOCKED_PATTERNS = [
  /example\./i,
  /test@/i,
  /noreply/i,
  /no-reply/i,
  /naver\.com$/i,
  /google\.com$/i,
  /facebook\.com$/i,
  /instagram\.com$/i,
  /youtube\.com$/i,
  /apple\.com$/i,
  /microsoft\.com$/i,
  /github\.com$/i,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i,
  /@2x\./i,
  /@3x\./i,
  /sentry\.io/i,
  /wixpress/i,
  /wordpress/i,
  /schema\.org/i,
  /w3\.org/i,
  /cloudflare/i,
  /googleapis/i,
];

function extractEmails(text: string): string[] {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(regex) || [];

  const unique = Array.from(new Set(matches));
  return unique.filter((email) => {
    if (email.length > 60) return false;
    if (email.startsWith(".") || email.startsWith("-")) return false;
    if (BLOCKED_PATTERNS.some((p) => p.test(email))) return false;
    // 최소 조건: @ 앞에 2자 이상, 도메인에 . 포함
    const [local, domain] = email.split("@");
    if (!local || local.length < 2) return false;
    if (!domain || !domain.includes(".")) return false;
    return true;
  });
}

async function fetchPage(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }

    return await res.text();
  } catch {
    return null;
  }
}

export async function extractEmailFromWebsite(url: string): Promise<string | null> {
  // URL 정규화
  let targetUrl = url;
  if (!targetUrl.startsWith("http")) {
    targetUrl = "https://" + targetUrl;
  }

  // 메인 페이지
  const html = await fetchPage(targetUrl);
  if (!html) return null;

  let emails = extractEmails(html);
  if (emails.length > 0) return emails[0];

  // 연락처/문의 페이지 시도
  const contactPaths = ["/contact", "/about", "/company", "/info"];
  const baseUrl = new URL(targetUrl).origin;

  for (const path of contactPaths) {
    const contactHtml = await fetchPage(baseUrl + path);
    if (contactHtml) {
      emails = extractEmails(contactHtml);
      if (emails.length > 0) return emails[0];
    }
  }

  return null;
}

export async function extractEmailFromInstagram(igUrl: string): Promise<string | null> {
  // 인스타그램 프로필 페이지에서 이메일 추출
  let profileUrl = igUrl;
  if (!profileUrl.endsWith("/")) profileUrl += "/";

  const html = await fetchPage(profileUrl);
  if (!html) return null;

  const emails = extractEmails(html);
  return emails.length > 0 ? emails[0] : null;
}

export type ExtractionResult = {
  businessId: string;
  businessName: string;
  email: string | null;
  source: "website" | "instagram" | "none";
};

export async function extractEmailForBusiness(business: {
  id: string;
  name: string;
  website: string | null;
  instagram: string | null;
}): Promise<ExtractionResult> {
  // 1순위: 웹사이트
  if (business.website) {
    const email = await extractEmailFromWebsite(business.website);
    if (email) {
      return {
        businessId: business.id,
        businessName: business.name,
        email,
        source: "website",
      };
    }
  }

  // 2순위: 인스타그램
  if (business.instagram) {
    const email = await extractEmailFromInstagram(business.instagram);
    if (email) {
      return {
        businessId: business.id,
        businessName: business.name,
        email,
        source: "instagram",
      };
    }
  }

  return {
    businessId: business.id,
    businessName: business.name,
    email: null,
    source: "none",
  };
}
