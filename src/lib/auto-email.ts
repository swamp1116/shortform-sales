import { SupabaseClient } from "@supabase/supabase-js";
import { generateSalesEmail } from "./claude";
import { sendEmail } from "./email";
import type { Business } from "./supabase";

/**
 * 이메일이 있지만 아직 발송하지 않은 업체에 자동으로 영업이메일 발송
 * 중복 발송 방지: email_campaigns에 이미 기록이 있으면 skip
 */
export async function autoSendEmails(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<{ sent: number; failed: number; skipped: number }> {
  // 1. 이메일이 있는 업체 조회
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .not("email", "is", null)
    .order("created_at", { ascending: true });

  if (!businesses || businesses.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  // 2. 이미 발송된 업체 ID 조회 (중복 방지)
  const { data: sentCampaigns } = await supabase
    .from("email_campaigns")
    .select("business_id");

  const sentIds = new Set(sentCampaigns?.map((c) => c.business_id) || []);

  // 3. 미발송 업체 필터링
  const unsent = (businesses as Business[]).filter(
    (biz) => !sentIds.has(biz.id)
  );

  if (unsent.length === 0) {
    return { sent: 0, failed: 0, skipped: businesses.length };
  }

  // 4. limit만큼 발송 (API 비용/시간 제한)
  const targets = unsent.slice(0, limit);
  let sent = 0;
  let failed = 0;

  for (const biz of targets) {
    try {
      // Claude로 맞춤 이메일 생성
      const { subject, body } = await generateSalesEmail(biz);

      // 캠페인 레코드 생성 (pending)
      const { data: campaign } = await supabase
        .from("email_campaigns")
        .insert({
          business_id: biz.id,
          subject,
          body,
          status: "pending",
        })
        .select()
        .single();

      // Resend로 발송
      const result = await sendEmail({
        to: biz.email!,
        subject,
        html: body,
      });

      if (result.success && campaign) {
        // 성공: 상태 업데이트
        await supabase
          .from("email_campaigns")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", campaign.id);

        // CRM 상태: contacted
        await supabase.from("crm_status").upsert(
          {
            business_id: biz.id,
            status: "contacted",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id" }
        );

        sent++;
        console.log(`  ✉️ 발송 성공: ${biz.name} → ${biz.email}`);
      } else {
        // 실패: 상태 업데이트
        if (campaign) {
          await supabase
            .from("email_campaigns")
            .update({ status: "failed" })
            .eq("id", campaign.id);
        }
        failed++;
        console.log(`  ❌ 발송 실패: ${biz.name} (${result.error})`);
      }

      // rate limiting (Resend 제한 대응)
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      failed++;
      console.log(
        `  ❌ 에러: ${biz.name} (${err instanceof Error ? err.message : "unknown"})`
      );
    }
  }

  return { sent, failed, skipped: sentIds.size };
}
