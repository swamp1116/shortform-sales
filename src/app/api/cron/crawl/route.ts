import { NextRequest, NextResponse } from "next/server";
import { crawlLite } from "@/lib/crawler-lite";
import { getServiceClient } from "@/lib/supabase";
import { autoSendEmails } from "@/lib/auto-email";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") || "";
  if (ua.includes("vercel-cron")) return true;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  if (!process.env.CRON_SECRET) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  try {
    // === 1단계: 크롤링 ===
    const { data: existing } = await supabase.from("businesses").select("name");
    const existingNames = new Set(existing?.map((b) => b.name) || []);

    const results = await crawlLite(5, 30, (msg) => console.log(msg), { fast: true });
    const newResults = results.filter((biz) => !existingNames.has(biz.name));

    let savedCount = 0;
    if (newResults.length > 0) {
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

      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { data, error } = await supabase
          .from("businesses")
          .insert(batch)
          .select();
        if (!error && data) savedCount += data.length;
      }
    }

    // === 2단계: 자동 이메일 발송 ===
    // 이메일 있지만 미발송인 업체에 자동 발송 (최대 5건/시간)
    console.log("📧 자동 이메일 발송 시작...");
    const emailResult = await autoSendEmails(supabase, 5);

    const { count } = await supabase
      .from("businesses")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      message: "크롤링 + 이메일 발송 완료",
      crawl: {
        crawled: results.length,
        new: newResults.length,
        saved: savedCount,
      },
      email: emailResult,
      totalBusinesses: count,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "실패" },
      { status: 500 }
    );
  }
}
