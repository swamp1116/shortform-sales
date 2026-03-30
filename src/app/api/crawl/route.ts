import { NextRequest, NextResponse } from "next/server";
import { crawlBusinesses } from "@/lib/crawler";
import { getServiceClient } from "@/lib/supabase";
import { classifyBusiness } from "@/lib/claude";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const keywords = body.keywords as string[] | undefined;
    const maxPerKeyword = (body.maxPerKeyword as number) || 50;

    const results = await crawlBusinesses(keywords, maxPerKeyword);

    if (results.length === 0) {
      return NextResponse.json({ message: "수집된 업체가 없습니다.", count: 0 });
    }

    // Claude로 업종 분류
    const batchSize = 20;
    const classified: { name: string; classifiedCategory: string }[] = [];

    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const categories = await classifyBusiness(batch);
      classified.push(...categories);
    }

    // 분류 결과 매핑
    const categoryMap = new Map(
      classified.map((c) => [c.name, c.classifiedCategory])
    );

    // Supabase에 저장
    const supabase = getServiceClient();
    const toInsert = results.map((biz) => ({
      name: biz.name,
      category: categoryMap.get(biz.name) || biz.category,
      region: "서울",
      address: biz.address,
      phone: biz.phone,
      website: biz.website,
      instagram: biz.instagram,
      youtube: biz.youtube,
      email: biz.email,
      email_verified: biz.email !== null,
    }));

    const { data, error } = await supabase
      .from("businesses")
      .upsert(toInsert, { onConflict: "name" })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `${data?.length || 0}개 업체 수집 완료`,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "크롤링 실패" },
      { status: 500 }
    );
  }
}
