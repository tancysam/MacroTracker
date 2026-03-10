import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TRENDING_BLOCKLIST } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: scores, error } = await getSupabase()
      .from("heat_scores")
      .select("*")
      .order("heat_score", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (scores || []).filter(s => !TRENDING_BLOCKLIST.has(s.entity_name));
    return NextResponse.json({ scores: filtered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
