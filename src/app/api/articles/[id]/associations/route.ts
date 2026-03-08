import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { TIME_WINDOW_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Cosine similarity via dot product (OpenAI embeddings are L2-normalized) */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(dot, 1)); // clamp to [0,1]
}

/** Collect shared entity names between two entity bags, respecting activeTypes */
function getSharedEntities(
  focusEntities: Record<string, string[]>,
  candEntities: Record<string, string[]>,
  activeTypes: string[]
): string[] {
  const shared: string[] = [];
  for (const type of activeTypes) {
    const focusSet = new Set(focusEntities[type] || []);
    for (const e of candEntities[type] || []) {
      if (focusSet.has(e)) shared.push(e);
    }
  }
  return shared;
}

function sentimentToNum(sentiment: string | null): number {
  if (sentiment === "Bearish") return -0.6;
  if (sentiment === "Bullish") return 0.6;
  return 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const timeWindow = searchParams.get("time_window") || "1M";
    const sentiment = searchParams.get("sentiment");
    const entityTypes = searchParams.getAll("entity_types");
    const linkThreshold = parseFloat(searchParams.get("link_threshold") || "0.4");

    // Get the focus article
    const { data: focusArticle, error: focusError } = await getSupabase()
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (focusError || !focusArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Step 1: Pre-filter candidates
    const days = TIME_WINDOW_DAYS[timeWindow] || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = getSupabase()
      .from("articles")
      .select("*")
      .neq("id", id)
      .not("sentiment", "is", null)
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(100);

    if (sentiment && sentiment !== "All") {
      query = query.eq("sentiment", sentiment);
    }

    const { data: candidates, error: candError } = await query;

    if (candError || !candidates) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    // Step 2: Compute linkScore for each candidate
    const focusEntities: Record<string, string[]> = {
      companies: focusArticle.entities_companies || [],
      people: focusArticle.entities_people || [],
      policies: focusArticle.entities_policies || [],
      markets: focusArticle.entities_markets || [],
      topics: focusArticle.entities_topics || [],
    };

    const focusEmbedding: number[] | null =
      Array.isArray(focusArticle.embedding) && focusArticle.embedding.length > 0
        ? focusArticle.embedding
        : null;

    const activeTypes =
      entityTypes.length > 0
        ? [...entityTypes, "topics"]
        : ["companies", "people", "policies", "markets", "topics"];

    const scored = candidates
      .map((candidate) => {
        const candEntities: Record<string, string[]> = {
          companies: candidate.entities_companies || [],
          people: candidate.entities_people || [],
          policies: candidate.entities_policies || [],
          markets: candidate.entities_markets || [],
          topics: candidate.entities_topics || [],
        };

        // Shared entities (respecting active types)
        const shared = getSharedEntities(focusEntities, candEntities, activeTypes);
        const sharedCount = shared.length;

        // Entity overlap (Jaccard-like, only for active entity types)
        let totalCount = 0;
        for (const type of activeTypes) {
          totalCount += new Set(focusEntities[type] || []).size + new Set(candEntities[type] || []).size;
        }
        const entityOverlap = totalCount > 0 ? (2 * sharedCount) / totalCount : 0;

        // Magnitude proximity: 1 - |mag_a - mag_b| / 10
        const magProximity =
          1 - Math.abs((focusArticle.magnitude || 0) - (candidate.magnitude || 0)) / 10;

        // Sentiment match
        let sentimentMatch = 0;
        if (focusArticle.sentiment === candidate.sentiment) {
          sentimentMatch = 1;
        } else if (
          focusArticle.sentiment === "Neutral" ||
          candidate.sentiment === "Neutral"
        ) {
          sentimentMatch = 0.5;
        }

        // Real semantic similarity via embedding dot product
        const candEmbedding: number[] | null =
          Array.isArray(candidate.embedding) && candidate.embedding.length > 0
            ? candidate.embedding
            : null;

        const semanticSim =
          focusEmbedding && candEmbedding
            ? cosineSimilarity(focusEmbedding, candEmbedding)
            : 0.3; // fallback if either embedding is missing

        const linkScore =
          0.4 * semanticSim +
          0.3 * entityOverlap +
          0.2 * magProximity +
          0.1 * sentimentMatch;

        // Determine dominant entity type
        const typeContributions: Record<string, number> = {};
        for (const type of activeTypes) {
          const focusSet = new Set(focusEntities[type] || []);
          let count = 0;
          for (const e of candEntities[type] || []) {
            if (focusSet.has(e)) count++;
          }
          typeContributions[type] = count;
        }
        const dominantType = Object.entries(typeContributions).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] || "companies";

        return {
          article: candidate,
          linkScore,
          dominantType,
          sharedEntities: shared,
          breakdown: {
            semantic: semanticSim,
            entity: entityOverlap,
            magnitude: magProximity,
            sentiment: sentimentMatch,
          },
          sentimentNum: sentimentToNum(candidate.sentiment),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.linkScore >= linkThreshold);

    // Step 3: Top 5
    scored.sort((a, b) => b.linkScore - a.linkScore);
    const top5 = scored.slice(0, 5);

    // Build response nodes
    const focusSentNum = sentimentToNum(focusArticle.sentiment);

    const nodes = [
      {
        id: "focus",
        label: splitLabel(focusArticle.headline),
        type: "focus" as const,
        magnitude: focusArticle.magnitude || 0,
        sentiment: focusSentNum,
        linkScore: 1.0,
        source: focusArticle.source,
        date: formatShortDate(focusArticle.published_at),
        headline: focusArticle.headline,
        summary: focusArticle.summary,
        entities: {
          companies: focusArticle.entities_companies || [],
          people: focusArticle.entities_people || [],
          policies: focusArticle.entities_policies || [],
          markets: focusArticle.entities_markets || [],
        },
        breakdown: { semantic: 1, entity: 1, magnitude: 1, sentiment: 1 },
        level: 0,
        articleId: focusArticle.id,
      },
      ...top5.map((item, idx) => ({
        id: `n${idx + 1}`,
        label: splitLabel(item.article.headline),
        type: item.dominantType as "companies" | "people" | "policies" | "markets",
        magnitude: item.article.magnitude || 0,
        sentiment: item.sentimentNum,
        linkScore: Math.round(item.linkScore * 100) / 100,
        source: item.article.source,
        date: formatShortDate(item.article.published_at),
        headline: item.article.headline,
        summary: item.article.summary,
        entities: {
          companies: item.article.entities_companies || [],
          people: item.article.entities_people || [],
          policies: item.article.entities_policies || [],
          markets: item.article.entities_markets || [],
        },
        breakdown: {
          semantic: Math.round(item.breakdown.semantic * 100) / 100,
          entity: Math.round(item.breakdown.entity * 100) / 100,
          magnitude: Math.round(item.breakdown.magnitude * 100) / 100,
          sentiment: Math.round(item.breakdown.sentiment * 100) / 100,
        },
        level: 1,
        articleId: item.article.id,
      })),
    ];

    // Build edges (focus → each top-5 node, with shared entity names)
    const edges = top5.map((item, idx) => ({
      source: "focus",
      target: `n${idx + 1}`,
      score: Math.round(item.linkScore * 100) / 100,
      sharedEntities: item.sharedEntities,
    }));

    // Cross-edges between top-5 nodes sharing ≥2 entities (respecting activeTypes)
    for (let i = 0; i < top5.length; i++) {
      for (let j = i + 1; j < top5.length; j++) {
        const a = top5[i].article;
        const b = top5[j].article;
        const aEnts: Record<string, string[]> = {
          companies: a.entities_companies || [],
          people: a.entities_people || [],
          policies: a.entities_policies || [],
          markets: a.entities_markets || [],
          topics: a.entities_topics || [],
        };
        const bEnts: Record<string, string[]> = {
          companies: b.entities_companies || [],
          people: b.entities_people || [],
          policies: b.entities_policies || [],
          markets: b.entities_markets || [],
          topics: b.entities_topics || [],
        };
        const crossShared = getSharedEntities(aEnts, bEnts, activeTypes);
        if (crossShared.length >= 2) {
          const crossScore = Math.min(crossShared.length * 0.15, 0.8);
          edges.push({
            source: `n${i + 1}`,
            target: `n${j + 1}`,
            score: Math.round(crossScore * 100) / 100,
            sharedEntities: crossShared,
          });
        }
      }
    }

    return NextResponse.json({
      focusArticle,
      nodes,
      edges,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function splitLabel(headline: string): string {
  const words = headline.split(" ");
  if (words.length <= 4) return headline;
  const mid = Math.ceil(words.length / 2);
  return words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}
