import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { generateDmMessage } from "@/lib/claude";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { businessIds } = (await req.json()) as { businessIds?: string[] };
    const supabase = getServiceClient();

    let query = supabase
      .from("businesses")
      .select("id, name, category, instagram")
      .not("instagram", "is", null);

    if (businessIds && businessIds.length > 0) {
      query = query.in("id", businessIds);
    } else {
      // DM 문구 없는 업체만
      query = query.is("dm_message", null);
    }

    const { data: businesses, error } = await query.limit(10);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ message: "대상 없음", generated: 0 });
    }

    let generated = 0;
    for (const biz of businesses) {
      const dm = await generateDmMessage(biz);
      if (dm) {
        await supabase
          .from("businesses")
          .update({ dm_message: dm, dm_status: "pending" })
          .eq("id", biz.id);
        generated++;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json({ message: `${generated}개 DM 생성 완료`, generated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "생성 실패" },
      { status: 500 }
    );
  }
}
