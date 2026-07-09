import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TOPIC_KEYWORDS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function buildTopicFilterClauses(topics: string[]): string {
  const clauses: string[] = [];
  for (const topic of topics) {
    // Always check taxonomy_tags for exact match
    clauses.push(`taxonomy_tags.cs.{${topic}}`);
    // Check primary_topic_key with ILIKE
    clauses.push(`primary_topic_key.ilike.%${topic}%`);

    // Expand via TOPIC_KEYWORDS — check each keyword against all entity columns via ILIKE
    const keywords = TOPIC_KEYWORDS[topic];
    if (keywords) {
      for (const kw of keywords) {
        clauses.push(`primary_topic_key.ilike.%${kw}%`);
        clauses.push(`headline.ilike.%${kw}%`);
      }
    }
  }
  return clauses.join(",");
}

export async function GET(request: NextRequest) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = request.nextUrl;
    const topicsParam = searchParams.get("topics");
    const topics = topicsParam ? topicsParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const sort = searchParams.get("sort") || "recency";
    const limit = parseInt(searchParams.get("limit") || "20");
    const minMagnitude = parseFloat(searchParams.get("min_magnitude") || "0");

    let query = getServiceClient()
      .from("articles")
      .select("*")
      .not("sentiment", "is", null)
      .order("published_at", { ascending: false })
      .limit(limit);

    // Topic filtering — union of all selected topics with keyword expansion
    if (topics.length > 0) {
      query = query.or(buildTopicFilterClauses(topics));
    }

    // Magnitude filtering
    if (minMagnitude > 0) {
      query = query.gte("magnitude", minMagnitude);
    }

    const { data: articles, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!articles) {
      return NextResponse.json({ articles: [] });
    }

    // Apply sorting
    if (sort === "magnitude") {
      const sorted = [...articles].sort(
        (a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0)
      );
      return NextResponse.json({ articles: sorted });
    }

    // Recency sort (default) — already ordered by published_at DESC
    return NextResponse.json({ articles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
