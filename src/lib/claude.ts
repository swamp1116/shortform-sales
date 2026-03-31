import Anthropic from "@anthropic-ai/sdk";
import type { Business } from "./supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function classifyBusiness(
  businesses: { name: string; category: string; address: string }[]
): Promise<{ name: string; classifiedCategory: string }[]> {
  const bizList = businesses
    .map((b) => `- ${b.name} (${b.category}, ${b.address})`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `다음 업체들을 숏폼 콘텐츠 제작 대행 영업 관점에서 업종을 분류해주세요.
분류 카테고리: 음식점, 카페, 뷰티(미용/네일/피부), 의료(병원/치과/한의원), 피트니스(헬스/요가/필라테스), 교육(학원), 반려동물, 리테일(옷/잡화), 라이프스타일(꽃/인테리어), 기타

JSON 배열로만 응답하세요. 다른 텍스트 없이 순수 JSON만:
[{"name": "업체명", "classifiedCategory": "분류"}]

업체 목록:
${bizList}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateSalesEmail(
  business: Business
): Promise<{ subject: string; body: string }> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `당신은 숏폼 콘텐츠 제작 대행사의 영업 담당자입니다.
다음 업체에 맞춤 영업 이메일을 작성해주세요.

업체 정보:
- 업체명: ${business.name}
- 업종: ${business.category}
- 지역: ${business.address}
- 인스타그램: ${business.instagram || "없음"}
- 유튜브: ${business.youtube || "없음"}
- 홈페이지: ${business.website || "없음"}

요구사항:
1. 해당 업종에 맞는 숏폼 콘텐츠 활용 사례를 구체적으로 제시
2. SNS 현황을 분석하여 개선 포인트 제안
3. 전문적이지만 친근한 톤
4. 무료 샘플 영상 제작 제안 포함
5. CTA(Call to Action) 포함

JSON으로만 응답:
{"subject": "이메일 제목", "body": "이메일 본문(HTML)"}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      subject: `${business.name} 대표님, 숏폼 콘텐츠로 매출을 올려보세요`,
      body: `<p>${business.name} 대표님 안녕하세요.</p><p>숏폼 콘텐츠 제작 대행 문의드립니다.</p>`,
    };
  }
  return JSON.parse(jsonMatch[0]);
}

export async function generateDmMessage(
  business: { name: string; category: string; instagram: string | null }
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `당신은 숏폼 콘텐츠 제작 대행사의 영업 담당자입니다.
인스타그램 DM으로 보낼 영업 메시지를 작성해주세요.

업체 정보:
- 업체명: ${business.name}
- 업종: ${business.category}
- 인스타그램: ${business.instagram || "있음"}

작성 규칙:
1. "안녕하세요! ${business.name} 계정 보다가 연락드려요 :)" 로 시작
2. 해당 업종에서 숏폼/릴스 콘텐츠가 왜 중요한지 자연스럽게 언급
3. 릴스/숏폼이 없거나 부족해 보인다면 부드럽게 제안
4. 저희 숏폼 제작 서비스를 가볍게 소개 (강요 금지)
5. 무료 샘플 영상 1개 제작 제안
6. 간단한 미팅/통화 제안으로 마무리
7. 500자 이내
8. 친근하고 자연스러운 말투 (스팸 느낌 절대 금지)
9. 이모지 적절히 사용
10. 줄바꿈으로 가독성 좋게

DM 메시지만 출력하세요. JSON이나 다른 포맷 없이 순수 텍스트만:`,
      },
    ],
  });

  return message.content[0].type === "text"
    ? message.content[0].text.trim()
    : "";
}
