import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TOPIC_KEYWORDS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function escapeArrayValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function arrayContainsClause(column: string, value: string): string {
  return `${column}.cs.{"${escapeArrayValue(value)}"}`;
}

function normalizeEntityType(entityType: string | null): string {
  return (entityType || "").trim().toLowerCase();
}

function buildTimelineFilterClauses(topic: string, entityType: string): string {
  const clauses: string[] = [];
  const normalizedType = normalizeEntityType(entityType);

  const addTopicLikeFallbacks = () => {
    clauses.push(arrayContainsClause("taxonomy_tags", topic));
    clauses.push(`primary_topic_key.ilike.%${topic}%`);
    clauses.push(`headline.ilike.%${topic}%`);

    const keywords = TOPIC_KEYWORDS[topic];
    if (keywords) {
      for (const kw of keywords) {
        clauses.push(`primary_topic_key.ilike.%${kw}%`);
        clauses.push(`headline.ilike.%${kw}%`);
      }
    }
  };

  if (normalizedType === "topics" || normalizedType === "topic") {
    clauses.push(arrayContainsClause("entities_topics", topic));
    addTopicLikeFallbacks();
  } else if (normalizedType === "markets" || normalizedType === "market") {
    clauses.push(arrayContainsClause("entities_markets", topic));
    clauses.push(`headline.ilike.%${topic}%`);
  } else if (normalizedType === "people" || normalizedType === "person") {
    clauses.push(arrayContainsClause("entities_people", topic));
    clauses.push(`headline.ilike.%${topic}%`);
  } else if (normalizedType === "companies" || normalizedType === "company") {
    clauses.push(arrayContainsClause("entities_companies", topic));
    clauses.push(`headline.ilike.%${topic}%`);
  } else if (normalizedType === "policies" || normalizedType === "policy") {
    clauses.push(arrayContainsClause("entities_policies", topic));
    clauses.push(`headline.ilike.%${topic}%`);
  } else {
    // Unknown/missing type: broad fallback across all entity columns.
    clauses.push(arrayContainsClause("entities_topics", topic));
    clauses.push(arrayContainsClause("entities_markets", topic));
    clauses.push(arrayContainsClause("entities_people", topic));
    clauses.push(arrayContainsClause("entities_companies", topic));
    clauses.push(arrayContainsClause("entities_policies", topic));
    addTopicLikeFallbacks();
  }

  return clauses.join(",");
}

export async function GET(request: NextRequest) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = request.nextUrl;
    const primaryTopicKey = searchParams.get("primary_topic_key");
    const entityType = searchParams.get("entity_type");
    const sentiment = searchParams.get("sentiment");
    const minMagnitude = parseFloat(searchParams.get("min_magnitude") || "0");

    if (!primaryTopicKey) {
      return NextResponse.json({ error: "primary_topic_key is required" }, { status: 400 });
    }

    let query = getServiceClient()
      .from("articles")
      .select("*")
      .not("sentiment", "is", null)
      .or(buildTimelineFilterClauses(primaryTopicKey, entityType || ""))
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
