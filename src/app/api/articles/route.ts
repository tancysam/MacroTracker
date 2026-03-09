import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const topicsParam = searchParams.get("topics");
    const topics = topicsParam ? topicsParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const sort = searchParams.get("sort") || "composite";
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = getSupabase()
      .from("articles")
      .select("*")
      .not("sentiment", "is", null)
      .order("published_at", { ascending: false })
      .limit(limit);

    // Topic filtering — union of all selected topics
    if (topics.length > 0) {
      const clauses = topics.map((t) =>
        `primary_topic_key.ilike.%${t}%,entities_topics.cs.{${t}},entities_markets.cs.{${t}},entities_companies.cs.{${t}},entities_policies.cs.{${t}}`
      );
      query = query.or(clauses.join(","));
    }

    const { data: articles, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!articles) {
      return NextResponse.json({ articles: [] });
    }

    // Apply sorting
    if (sort === "recency") {
      // Already sorted by published_at DESC
      return NextResponse.json({ articles });
    }

    if (sort === "heatscore") {
      // Fetch heat scores for all entities in articles
      const { data: heatScores } = await getSupabase()
        .from("heat_scores")
        .select("entity_name, heat_score");

      const scoreMap = new Map<string, number>();
      for (const hs of heatScores || []) {
        scoreMap.set(hs.entity_name, hs.heat_score);
      }

      // For each article, compute max heat score across its entities
      const scored = articles.map((a) => {
        const allEntities = [
          ...(a.entities_topics || []),
          ...(a.entities_markets || []),
          ...(a.entities_people || []),
          ...(a.entities_companies || []),
          ...(a.entities_policies || []),
        ];
        const maxHeat = allEntities.reduce(
          (max, e) => Math.max(max, scoreMap.get(e) || 0),
          0
        );
        return { ...a, _heat: maxHeat };
      });

      scored.sort((a, b) => b._heat - a._heat);
      return NextResponse.json({ articles: scored });
    }

    // Composite sort (default)
    const { data: heatScores } = await getSupabase()
      .from("heat_scores")
      .select("entity_name, heat_score");

    const scoreMap = new Map<string, number>();
    for (const hs of heatScores || []) {
      scoreMap.set(hs.entity_name, hs.heat_score);
    }

    const scored = articles.map((a) => {
      const allEntities = [
        ...(a.entities_topics || []),
        ...(a.entities_markets || []),
        ...(a.entities_people || []),
        ...(a.entities_companies || []),
        ...(a.entities_policies || []),
      ];
      const maxHeat = allEntities.reduce(
        (max, e) => Math.max(max, scoreMap.get(e) || 0),
        0
      );
      return { ...a, _heat: maxHeat };
    });

    // Normalize heat scores
    const maxHeat = Math.max(...scored.map((a) => a._heat), 1);
    const now = Date.now();

    const composite = scored.map((a) => {
      const normHeat = a._heat / maxHeat;
      const hoursSince =
        (now - new Date(a.published_at).getTime()) / (1000 * 60 * 60);
      const recencyDecay = Math.exp(-hoursSince / 24);
      const score = 0.6 * normHeat + 0.4 * recencyDecay;
      return { ...a, _composite: score };
    });

    composite.sort((a, b) => b._composite - a._composite);
    return NextResponse.json({ articles: composite });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
