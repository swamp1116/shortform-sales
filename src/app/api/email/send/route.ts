import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { generateSalesEmail } from "@/lib/claude";
import { sendEmail } from "@/lib/email";
import type { Business } from "@/lib/supabase";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessIds } = body as { businessIds?: string[] };

    const supabase = getServiceClient();

    // 대상 업체 조회
    let query = supabase
      .from("businesses")
      .select("*")
      .not("email", "is", null)
      .eq("email_verified", true);

    if (businessIds && businessIds.length > 0) {
      query = query.in("id", businessIds);
    }

    const { data: businesses, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ message: "발송 대상 업체가 없습니다.", sent: 0 });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const biz of businesses as Business[]) {
      try {
        // 이메일 생성
        const { subject, body: emailBody } = await generateSalesEmail(biz);

        // 캠페인 레코드 생성
        const { data: campaign } = await supabase
          .from("email_campaigns")
          .insert({
            business_id: biz.id,
            subject,
            body: emailBody,
            status: "pending",
          })
          .select()
          .single();

        // 이메일 발송
        const result = await sendEmail({
          to: biz.email!,
          subject,
          html: emailBody,
        });

        if (result.success && campaign) {
          await supabase
            .from("email_campaigns")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", campaign.id);

          // CRM 상태 업데이트
          await supabase.from("crm_status").upsert(
            {
              business_id: biz.id,
              status: "contacted",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "business_id" }
          );

          sentCount++;
        } else if (campaign) {
          await supabase
            .from("email_campaigns")
            .update({ status: "failed" })
            .eq("id", campaign.id);
          failedCount++;
        }

        // rate limiting
        await new Promise((r) => setTimeout(r, 1000));
      } catch {
        failedCount++;
      }
    }

    return NextResponse.json({
      message: `발송 완료: 성공 ${sentCount}건, 실패 ${failedCount}건`,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "발송 실패" },
      { status: 500 }
    );
  }
}
