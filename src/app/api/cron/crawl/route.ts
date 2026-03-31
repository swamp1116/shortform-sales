import { NextRequest, NextResponse } from "next/server";
import { crawlLite } from "@/lib/crawler-lite";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron 인증: x-vercel-cron-signature 또는 Authorization 헤더
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getServiceClient();

  try {
    // 기존 업체명 조회 (중복 방지)
    const { data: existing } = await supabase.from("businesses").select("name");
    const existingNames = new Set(existing?.map((b) => b.name) || []);

    // 60초 제한: fast 모드로 키워드 5개 × 30개 (상세 조회 생략)
    const results = await crawlLite(5, 30, (msg) => console.log(msg), { fast: true });

    // 중복 제거
    const newResults = results.filter((biz) => !existingNames.has(biz.name));

    if (newResults.length === 0) {
      return NextResponse.json({
        message: "신규 업체 없음",
        crawled: results.length,
        new: 0,
      });
    }

    // Supabase 저장
    const toInsert = newResults.map((biz) => ({
      name: biz.name,
      category: biz.category,
      region: "서울",
      address: biz.address,
      phone: biz.phone,
      website: biz.website,
      instagram: biz.instagram,
      youtube: biz.youtube,
      email: biz.email,
      email_verified: biz.email !== null,
    }));

    let savedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from("businesses")
        .insert(batch)
        .select();

      if (!error && data) savedCount += data.length;
    }

    const { count } = await supabase
      .from("businesses")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      message: "크롤링 완료",
      crawled: results.length,
      new: newResults.length,
      saved: savedCount,
      total: count,
    });
  } catch (error) {
    console.error("Cron crawl error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "크롤링 실패" },
      { status: 500 }
    );
  }
}
