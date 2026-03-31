import { NextRequest, NextResponse } from "next/server";
import { crawlLite } from "@/lib/crawler-lite";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  // 1. Vercel Cron은 내부 네트워크에서 호출되므로 user-agent로 식별
  const ua = req.headers.get("user-agent") || "";
  if (ua.includes("vercel-cron")) return true;

  // 2. CRON_SECRET이 설정된 경우 Authorization 헤더 확인
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  // 3. CRON_SECRET이 미설정이면 모든 요청 허용 (개발 편의)
  if (!process.env.CRON_SECRET) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  try {
    const { data: existing } = await supabase.from("businesses").select("name");
    const existingNames = new Set(existing?.map((b) => b.name) || []);

    const results = await crawlLite(5, 30, (msg) => console.log(msg), { fast: true });

    const newResults = results.filter((biz) => !existingNames.has(biz.name));

    if (newResults.length === 0) {
      return NextResponse.json({
        message: "신규 업체 없음",
        crawled: results.length,
        new: 0,
      });
    }

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
