import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  try {
    const { businessId, status } = (await req.json()) as {
      businessId: string;
      status: "pending" | "sent" | "replied";
    };

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("businesses")
      .update({ dm_status: status })
      .eq("id", businessId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업데이트 실패" },
      { status: 500 }
    );
  }
}
