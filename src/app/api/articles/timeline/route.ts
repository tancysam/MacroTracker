import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const primaryTopicKey = searchParams.get("primary_topic_key");
    const sentiment = searchParams.get("sentiment");

    if (!primaryTopicKey) {
      return NextResponse.json({ error: "primary_topic_key is required" }, { status: 400 });
    }

    let query = getSupabase()
      .from("articles")
      .select("*")
      .not("sentiment", "is", null)
      .or(
        `primary_topic_key.ilike.%${primaryTopicKey}%,entities_topics.cs.{${primaryTopicKey}},entities_markets.cs.{${primaryTopicKey}},entities_companies.cs.{${primaryTopicKey}},entities_policies.cs.{${primaryTopicKey}},entities_people.cs.{${primaryTopicKey}}`
      )
      .order("published_at", { ascending: false })
      .limit(50);

    if (sentiment && sentiment !== "All") {
      query = query.eq("sentiment", sentiment);
    }

    const { data: articles, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles: articles || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
