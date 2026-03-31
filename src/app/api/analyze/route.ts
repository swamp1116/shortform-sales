import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getServiceClient();

  const [businessRes, campaignRes, crmRes, categoryRes, dmRes] =
    await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase.from("email_campaigns").select("status"),
      supabase.from("crm_status").select("status"),
      supabase.from("businesses").select("category"),
      supabase.from("businesses").select("dm_status").not("instagram", "is", null),
    ]);

  const totalBusinesses = businessRes.count || 0;

  const campaigns = campaignRes.data || [];
  const emailStats = {
    total: campaigns.length,
    sent: campaigns.filter((c) => c.status === "sent").length,
    pending: campaigns.filter((c) => c.status === "pending").length,
    failed: campaigns.filter((c) => c.status === "failed").length,
  };

  const crm = crmRes.data || [];
  const crmStats = {
    contacted: crm.filter((c) => c.status === "contacted").length,
    replied: crm.filter((c) => c.status === "replied").length,
    meeting: crm.filter((c) => c.status === "meeting").length,
    contracted: crm.filter((c) => c.status === "contracted").length,
  };

  const categories = categoryRes.data || [];
  const categoryCount: Record<string, number> = {};
  for (const c of categories) {
    categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
  }

  const dmData = dmRes.data || [];
  const dmStats = {
    total: dmData.length,
    pending: dmData.filter((d) => d.dm_status === "pending" || !d.dm_status).length,
    sent: dmData.filter((d) => d.dm_status === "sent").length,
    replied: dmData.filter((d) => d.dm_status === "replied").length,
  };

  return NextResponse.json({
    totalBusinesses,
    emailStats,
    crmStats,
    categoryCount,
    dmStats,
  });
}
