import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const category = url.searchParams.get("category");
  const emailOnly = url.searchParams.get("emailOnly") === "true";

  let query = supabase
    .from("businesses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) {
    query = query.eq("category", category);
  }
  if (emailOnly) {
    query = query.not("email", "is", null);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit });
}
