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

function getCategoryHook(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("hospital") || cat.includes("병원") || cat.includes("의원") || cat.includes("치과") || cat.includes("피부과") || cat.includes("성형") || cat.includes("한의원") || cat.includes("안과") || cat.includes("클리닉")) {
    return `업종별 훅: "요즘 ChatGPT나 네이버 AI에서 시술명 검색하면 릴스 있는 곳이 먼저 뜨는데, 아직 숏폼이 없어서 아쉬워 보였어요" + 외국인 환자 유입 효과도 언급`;
  }
  if (cat.includes("뷰티") || cat.includes("화장품") || cat.includes("코스메틱") || cat.includes("스킨케어") || cat.includes("네일") || cat.includes("미용") || cat.includes("헤어")) {
    return `업종별 훅: AI 검색(ChatGPT/네이버AI) 최적화에서 숏폼 콘텐츠가 있어야 상위 노출된다는 점 + 경쟁 브랜드들은 이미 릴스를 적극 활용 중인데 격차가 벌어지고 있다는 점 언급`;
  }
  if (cat.includes("헬스") || cat.includes("피트니스") || cat.includes("필라테스") || cat.includes("요가") || cat.includes("PT") || cat.includes("크로스핏") || cat.includes("복싱") || cat.includes("운동")) {
    return `업종별 훅: 팔로워 수 대비 릴스 조회수가 낮거나 릴스가 아예 없는 점 언급 + "운동 전후 비포/애프터 릴스 하나가 신규 회원 문의 10건 이상 만들어요"`;
  }
  if (cat.includes("엔터") || cat.includes("기획사") || cat.includes("MCN") || cat.includes("매니지먼트") || cat.includes("레이블") || cat.includes("프로덕션") || cat.includes("광고") || cat.includes("마케팅")) {
    return `업종별 훅: 소속 아티스트/크리에이터의 숏폼 콘텐츠가 부족하거나 일관성이 없는 점 언급 + "팬 유입과 바이럴에 릴스가 핵심인데 체계적인 숏폼 전략이 아쉬워 보였어요"`;
  }
  if (cat.includes("교육") || cat.includes("학원") || cat.includes("코딩") || cat.includes("영어") || cat.includes("입시") || cat.includes("에듀")) {
    return `업종별 훅: AI 검색 최적화에서 숏폼이 있어야 수강생 유입이 늘어난다는 점 + "강의 하이라이트 30초 릴스 하나가 수강 문의 전환율을 크게 올려요"`;
  }
  if (cat.includes("게임") || cat.includes("game")) {
    return `업종별 훅: 신작/업데이트 때 숏폼 홍보가 없는 점 언급 + "유저 획득 비용(CPI)이 릴스 광고에서 가장 낮다는 데이터가 있어요"`;
  }
  return `업종별 훅: AI 검색(ChatGPT/네이버AI)에서 숏폼 콘텐츠가 있는 브랜드가 먼저 추천된다는 점 자연스럽게 언급`;
}

export async function generateDmMessage(
  business: { name: string; category: string; instagram: string | null }
): Promise<string> {
  const hook = getCategoryHook(business.category);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `인스타그램 DM 영업 메시지를 작성하세요.

업체: ${business.name}
업종: ${business.category}
인스타: ${business.instagram || "있음"}

${hook}

형식 (4줄 구성, 총 300자 이내):
1줄: ${business.name} 인스타 보다가 연락했다는 자연스러운 시작
2줄: 위 업종별 훅을 자연스럽게 녹인 한 문장 (팔로워수/릴스 유무 반드시 언급)
3줄: 저희가 무료 샘플 영상 하나 만들어드릴 수 있다는 가벼운 제안
4줄: 부담없이 답장이나 10분 통화 제안

규칙:
- 300자 이내 엄수
- 이모지 1~2개만
- 친근하고 자연스러운 말투 (광고/스팸 느낌 절대 금지)
- 줄바꿈으로 구분
- DM 텍스트만 출력 (JSON/코드블록 금지)`,
      },
    ],
  });

  return message.content[0].type === "text"
    ? message.content[0].text.trim()
    : "";
}
