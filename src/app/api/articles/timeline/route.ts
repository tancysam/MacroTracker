import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { TOPIC_KEYWORDS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function buildTimelineFilterClauses(topic: string): string {
  const clauses: string[] = [
    `taxonomy_tags.cs.{${topic}}`,
    `primary_topic_key.ilike.%${topic}%`,
  ];

  const keywords = TOPIC_KEYWORDS[topic];
  if (keywords) {
    for (const kw of keywords) {
      clauses.push(`primary_topic_key.ilike.%${kw}%`);
      clauses.push(`headline.ilike.%${kw}%`);
    }
  }

  return clauses.join(",");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const primaryTopicKey = searchParams.get("primary_topic_key");
    const sentiment = searchParams.get("sentiment");
    const minMagnitude = parseFloat(searchParams.get("min_magnitude") || "0");

    if (!primaryTopicKey) {
      return NextResponse.json({ error: "primary_topic_key is required" }, { status: 400 });
    }

    let query = getSupabase()
      .from("articles")
      .select("*")
      .not("sentiment", "is", null)
      .or(buildTimelineFilterClauses(primaryTopicKey))
      .order("published_at", { ascending: false })
      .limit(50);

    if (sentiment && sentiment !== "All") {
      query = query.eq("sentiment", sentiment);
    }

    if (minMagnitude > 0) {
      query = query.gte("magnitude", minMagnitude);
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
