import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { TIME_WINDOW_DAYS } from "@/lib/constants";
import type {
  Article,
  AssociationEdge,
  AssociationMode,
  AssociationNode,
  AssociationTracePath,
  AssociationsView,
  EntityType,
  RelatedAssociationEvent,
  Sentiment,
  TimeWindow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type ScoringConfig = {
  threshold: number;
  maxRelated: number;
  minEvidenceSignals: number;
  weights: {
    semantic: number;
    entity: number;
    magnitude: number;
    sentiment: number;
    temporal: number;
  };
};

type ArticleEntities = Record<string, string[]>;

const MODE_CONFIG: Record<AssociationMode, ScoringConfig> = {
  broad: {
    threshold: 0.45,
    maxRelated: 8,
    minEvidenceSignals: 1,
    weights: { semantic: 0.35, entity: 0.25, magnitude: 0.15, sentiment: 0.1, temporal: 0.15 },
  },
  balanced: {
    threshold: 0.55,
    maxRelated: 6,
    minEvidenceSignals: 2,
    weights: { semantic: 0.35, entity: 0.3, magnitude: 0.15, sentiment: 0.1, temporal: 0.1 },
  },
  strict: {
    threshold: 0.65,
    maxRelated: 5,
    minEvidenceSignals: 2,
    weights: { semantic: 0.4, entity: 0.3, magnitude: 0.15, sentiment: 0.1, temporal: 0.05 },
  },
  investigative: {
    threshold: 0.58,
    maxRelated: 7,
    minEvidenceSignals: 2,
    weights: { semantic: 0.3, entity: 0.25, magnitude: 0.1, sentiment: 0.05, temporal: 0.3 },
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toMode(value: string | null): AssociationMode {
  if (value === "broad" || value === "balanced" || value === "strict" || value === "investigative") {
    return value;
  }
  return "balanced";
}

function toView(value: string | null): AssociationsView {
  return value === "graph" ? "graph" : "evidence";
}

function parseDepth(value: string | null): number {
  const parsed = Number.parseInt(value || "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return clamp(parsed, 1, 3);
}

function parseThreshold(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, 0.3, 0.95);
}

function parseTimeWindow(value: string | null): TimeWindow {
  if (value === "7D" || value === "1M" || value === "3M" || value === "6M") return value;
  return "1M";
}

function parseSentiment(value: string | null): Sentiment | "All" {
  if (value === "Bullish" || value === "Bearish" || value === "Neutral") return value;
  return "All";
}

function toEmbedding(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed = value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isFinite(item));
  return parsed.length > 0 ? parsed : null;
}

function cosineSimilarity(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0.3;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return clamp(dot, 0, 1);
}

function sentimentToNum(sentiment: string | null): number {
  if (sentiment === "Bearish") return -0.6;
  if (sentiment === "Bullish") return 0.6;
  return 0;
}

function getEntities(article: Article): ArticleEntities {
  return {
    companies: article.entities_companies || [],
    people: article.entities_people || [],
    policies: article.entities_policies || [],
    markets: article.entities_markets || [],
    topics: article.entities_topics || [],
  };
}

function getSharedEntitiesByType(
  reference: ArticleEntities,
  candidate: ArticleEntities,
  activeTypes: string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const type of activeTypes) {
    const left = new Set(reference[type] || []);
    const shared = (candidate[type] || []).filter((entity) => left.has(entity));
    result[type] = [...new Set(shared)];
  }
  return result;
}

function entityOverlapScore(
  reference: ArticleEntities,
  candidate: ArticleEntities,
  activeTypes: string[]
): { overlap: number; sharedCount: number; sharedByType: Record<string, string[]> } {
  const sharedByType = getSharedEntitiesByType(reference, candidate, activeTypes);
  const sharedCount = Object.values(sharedByType).reduce((sum, list) => sum + list.length, 0);

  let totalCount = 0;
  for (const type of activeTypes) {
    totalCount += new Set(reference[type] || []).size + new Set(candidate[type] || []).size;
  }

  const overlap = totalCount > 0 ? (2 * sharedCount) / totalCount : 0;
  return { overlap, sharedCount, sharedByType };
}

function temporalContext(
  referenceDate: string,
  candidateDate: string,
  windowDays: number
): { score: number; relation: "preceded" | "followed" | "same_day" } {
  const referenceTime = new Date(referenceDate).getTime();
  const candidateTime = new Date(candidateDate).getTime();
  const dayDiff = (referenceTime - candidateTime) / (1000 * 60 * 60 * 24);

  if (Math.abs(dayDiff) < 1) {
    return { score: 0.6, relation: "same_day" };
  }

  if (dayDiff > 0) {
    // Candidate came before the event being explained.
    const score = clamp(1 - dayDiff / Math.max(windowDays, 1), 0, 1);
    return { score, relation: "preceded" };
  }

  // Candidate came after: weaker support signal.
  const afterDays = Math.abs(dayDiff);
  const score = clamp(0.35 - afterDays / (windowDays * 2), 0, 0.35);
  return { score, relation: "followed" };
}

function dominantType(sharedByType: Record<string, string[]>): EntityType {
  const ordered = (["companies", "people", "policies", "markets"] as EntityType[]).map((type) => ({
    type,
    count: (sharedByType[type] || []).length,
  }));

  ordered.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return ordered[0]?.count > 0 ? ordered[0].type : "companies";
}

function buildExplanation(evidence: {
  relation: "preceded" | "followed" | "same_day";
  sharedCount: number;
  dominantType: EntityType;
  semantic: number;
  temporal: number;
}): string[] {
  const relationText =
    evidence.relation === "preceded"
      ? "Earlier event with temporal proximity"
      : evidence.relation === "same_day"
        ? "Same-day context around the focus event"
        : "Later event with weaker temporal contribution";

  return [
    `${evidence.sharedCount} shared entities (${evidence.dominantType})`,
    `Semantic similarity ${(evidence.semantic * 100).toFixed(0)}%`,
    `${relationText} (${(evidence.temporal * 100).toFixed(0)}%)`,
  ];
}

function byStableScore<T extends { link_score: number; article_id: string; published_at: string }>(a: T, b: T): number {
  if (b.link_score !== a.link_score) return b.link_score - a.link_score;
  const timeDiff = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.article_id.localeCompare(b.article_id);
}

function splitLabel(headline: string): string {
  const words = headline.split(" ");
  if (words.length <= 5) return headline;
  const mid = Math.ceil(words.length / 2);
  return `${words.slice(0, mid).join(" ")}\n${words.slice(mid).join(" ")}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function scoreCandidate(
  reference: Article,
  candidate: Article,
  activeTypes: string[],
  config: ScoringConfig,
  windowDays: number
) {
  const referenceEntities = getEntities(reference);
  const candidateEntities = getEntities(candidate);

  const { overlap, sharedCount, sharedByType } = entityOverlapScore(referenceEntities, candidateEntities, activeTypes);
  const semantic = cosineSimilarity(toEmbedding(reference.embedding), toEmbedding(candidate.embedding));
  const magnitude = 1 - Math.abs((Number(reference.magnitude) || 0) - (Number(candidate.magnitude) || 0)) / 10;

  let sentiment = 0;
  if (reference.sentiment === candidate.sentiment) sentiment = 1;
  else if (reference.sentiment === "Neutral" || candidate.sentiment === "Neutral") sentiment = 0.5;

  const temporal = temporalContext(reference.published_at, candidate.published_at, windowDays);
  const type = dominantType(sharedByType);

  const linkScore =
    config.weights.semantic * semantic +
    config.weights.entity * overlap +
    config.weights.magnitude * clamp(magnitude, 0, 1) +
    config.weights.sentiment * sentiment +
    config.weights.temporal * temporal.score;

  const evidenceSignals =
    (sharedCount > 0 ? 1 : 0) +
    (semantic >= 0.55 ? 1 : 0) +
    (temporal.score >= 0.35 ? 1 : 0);

  return {
    linkScore: clamp(linkScore, 0, 1),
    evidenceSignals,
    dominantType: type,
    semantic,
    overlap,
    magnitude: clamp(magnitude, 0, 1),
    sentiment,
    temporal,
    sharedByType,
    sharedCount,
  };
}

function buildTracePaths(
  focus: Article,
  relatedEvents: RelatedAssociationEvent[],
  candidates: Article[],
  activeTypes: string[],
  config: ScoringConfig,
  windowDays: number,
  depth: number
): AssociationTracePath[] {
  if (depth <= 1 || relatedEvents.length === 0) return [];

  const traces: AssociationTracePath[] = [];
  const roots = relatedEvents.slice(0, Math.min(3, relatedEvents.length));
  const candidatesById = new Map(candidates.map((article) => [article.id, article]));

  for (const root of roots) {
    const rootArticle = candidatesById.get(root.article_id);
    if (!rootArticle) continue;

    const nodes = [
      {
        article_id: focus.id,
        headline: focus.headline,
        published_at: focus.published_at,
        source: focus.source,
        link_score: 1,
        why_it_matters: "Focus event under investigation",
      },
      {
        article_id: rootArticle.id,
        headline: rootArticle.headline,
        published_at: rootArticle.published_at,
        source: rootArticle.source,
        link_score: root.link_score,
        why_it_matters: root.explanation[0] || "Strongly linked event",
      },
    ];

    const used = new Set<string>([focus.id, rootArticle.id]);
    let current = rootArticle;

    for (let level = 2; level <= depth; level++) {
      const predecessors = candidates
        .filter((cand) => !used.has(cand.id))
        .filter((cand) => new Date(cand.published_at).getTime() <= new Date(current.published_at).getTime())
        .map((cand) => {
          const score = scoreCandidate(current, cand, activeTypes, config, windowDays);
          return {
            article: cand,
            score,
          };
        })
        .filter((item) => item.score.linkScore >= Math.max(0.45, config.threshold - 0.08))
        .filter((item) => item.score.evidenceSignals >= config.minEvidenceSignals)
        .sort((a, b) => {
          if (b.score.linkScore !== a.score.linkScore) return b.score.linkScore - a.score.linkScore;
          const dateDiff = new Date(b.article.published_at).getTime() - new Date(a.article.published_at).getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.article.id.localeCompare(b.article.id);
        });

      const best = predecessors[0];
      if (!best) break;

      used.add(best.article.id);
      current = best.article;
      nodes.push({
        article_id: best.article.id,
        headline: best.article.headline,
        published_at: best.article.published_at,
        source: best.article.source,
        link_score: Math.round(best.score.linkScore * 100) / 100,
        why_it_matters: `${best.score.sharedCount} shared entities, temporal ${(
          best.score.temporal.score * 100
        ).toFixed(0)}%`,
      });
    }

    if (nodes.length >= 3) {
      const totalScore =
        nodes.reduce((sum, node) => sum + node.link_score, 0) / Math.max(nodes.length, 1);
      traces.push({
        path_id: `trace_${root.article_id}`,
        root_event_id: root.article_id,
        nodes,
        total_score: Math.round(totalScore * 100) / 100,
      });
    }
  }

  return traces.sort((a, b) => b.total_score - a.total_score || a.path_id.localeCompare(b.path_id));
}

function toLegacyGraph(
  focus: Article,
  relatedEvents: RelatedAssociationEvent[],
  tracePaths: AssociationTracePath[]
): { nodes: AssociationNode[]; edges: AssociationEdge[] } {
  const nodes: AssociationNode[] = [
    {
      id: "focus",
      label: splitLabel(focus.headline),
      type: "focus",
      magnitude: Number(focus.magnitude) || 0,
      sentiment: sentimentToNum(focus.sentiment),
      linkScore: 1,
      source: focus.source,
      date: formatShortDate(focus.published_at),
      headline: focus.headline,
      summary: focus.summary,
      entities: {
        companies: focus.entities_companies || [],
        people: focus.entities_people || [],
        policies: focus.entities_policies || [],
        markets: focus.entities_markets || [],
      },
      breakdown: { semantic: 1, entity: 1, magnitude: 1, sentiment: 1 },
      level: 0,
      articleId: focus.id,
    },
  ];

  const edges: AssociationEdge[] = [];
  const idByArticle = new Map<string, string>([[focus.id, "focus"]]);

  for (let i = 0; i < relatedEvents.length; i++) {
    const event = relatedEvents[i];
    const id = `n${i + 1}`;
    idByArticle.set(event.article_id, id);
    nodes.push({
      id,
      label: splitLabel(event.headline),
      type: event.dominant_type,
      magnitude: Number(event.magnitude) || 0,
      sentiment: sentimentToNum(event.sentiment),
      linkScore: event.link_score,
      source: event.source,
      date: formatShortDate(event.published_at),
      headline: event.headline,
      summary: event.summary,
      entities: {
        companies: event.evidence.shared_entities_by_type.companies || [],
        people: event.evidence.shared_entities_by_type.people || [],
        policies: event.evidence.shared_entities_by_type.policies || [],
        markets: event.evidence.shared_entities_by_type.markets || [],
      },
      breakdown: {
        semantic: event.evidence.semantic_similarity,
        entity: event.evidence.entity_overlap,
        magnitude: event.evidence.magnitude_proximity,
        sentiment: event.evidence.sentiment_alignment,
      },
      level: 1,
      articleId: event.article_id,
    });
    edges.push({
      source: "focus",
      target: id,
      score: event.link_score,
      sharedEntities: Object.values(event.evidence.shared_entities_by_type).flat(),
    });
  }

  let levelIndex = 2;
  for (const trace of tracePaths) {
    for (const node of trace.nodes.slice(2)) {
      if (idByArticle.has(node.article_id)) continue;
      const id = `t${levelIndex}_${idByArticle.size}`;
      idByArticle.set(node.article_id, id);
      nodes.push({
        id,
        label: splitLabel(node.headline),
        type: "policies",
        magnitude: 5,
        sentiment: 0,
        linkScore: node.link_score,
        source: node.source,
        date: formatShortDate(node.published_at),
        headline: node.headline,
        summary: null,
        entities: { companies: [], people: [], policies: [], markets: [] },
        breakdown: { semantic: 0.5, entity: 0.5, magnitude: 0.5, sentiment: 0.5 },
        level: levelIndex,
        articleId: node.article_id,
      });
    }
    levelIndex += 1;

    for (let idx = 1; idx < trace.nodes.length; idx++) {
      const sourceId = idByArticle.get(trace.nodes[idx - 1].article_id);
      const targetId = idByArticle.get(trace.nodes[idx].article_id);
      if (!sourceId || !targetId || sourceId === targetId) continue;
      edges.push({
        source: sourceId,
        target: targetId,
        score: trace.nodes[idx].link_score,
      });
    }
  }

  return { nodes, edges };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;

    const timeWindow = parseTimeWindow(searchParams.get("time_window"));
    const sentiment = parseSentiment(searchParams.get("sentiment"));
    const mode = toMode(searchParams.get("mode"));
    const depth = parseDepth(searchParams.get("depth"));
    const view = toView(searchParams.get("view"));
    const config = MODE_CONFIG[mode];

    const threshold = parseThreshold(searchParams.get("link_threshold"), config.threshold);
    const maxRelated = clamp(
      Number.parseInt(searchParams.get("max_related") || `${config.maxRelated}`, 10) || config.maxRelated,
      3,
      12
    );

    const requestedEntityTypes = searchParams.getAll("entity_types");
    const entityTypes =
      requestedEntityTypes.length > 0
        ? [...new Set([...requestedEntityTypes.filter(Boolean), "topics"])]
        : ["companies", "people", "policies", "markets", "topics"];

    const { data: focusArticle, error: focusError } = await getSupabase()
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (focusError || !focusArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const days = TIME_WINDOW_DAYS[timeWindow] || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let candidateQuery = getSupabase()
      .from("articles")
      .select("*")
      .neq("id", id)
      .not("sentiment", "is", null)
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(240);

    if (sentiment !== "All") {
      candidateQuery = candidateQuery.eq("sentiment", sentiment);
    }

    const { data: candidates, error: candidateError } = await candidateQuery;
    if (candidateError || !candidates) {
      return NextResponse.json({
        focus: focusArticle,
        related_events: [],
        trace_paths: [],
        scoring_version: "associations-v2.0.0",
        applied_params: {
          time_window: timeWindow,
          sentiment,
          mode,
          depth,
          view,
          link_threshold: threshold,
          entity_types: entityTypes,
          max_related: maxRelated,
        },
        generated_at: new Date().toISOString(),
        focusArticle,
        nodes: [],
        edges: [],
      });
    }

    const scored = (candidates as Article[])
      .map((candidate) => {
        const score = scoreCandidate(focusArticle as Article, candidate, entityTypes, config, days);
        const explanation = buildExplanation({
          relation: score.temporal.relation,
          sharedCount: score.sharedCount,
          dominantType: score.dominantType,
          semantic: score.semantic,
          temporal: score.temporal.score,
        });

        return {
          article_id: candidate.id,
          headline: candidate.headline,
          summary: candidate.summary,
          source: candidate.source,
          published_at: candidate.published_at,
          sentiment: candidate.sentiment as Sentiment,
          magnitude: Number(candidate.magnitude) || 0,
          dominant_type: score.dominantType,
          link_score: Math.round(score.linkScore * 100) / 100,
          explanation,
          evidence: {
            shared_entities_by_type: score.sharedByType,
            shared_entity_count: score.sharedCount,
            semantic_similarity: Math.round(score.semantic * 100) / 100,
            entity_overlap: Math.round(score.overlap * 100) / 100,
            magnitude_proximity: Math.round(score.magnitude * 100) / 100,
            sentiment_alignment: Math.round(score.sentiment * 100) / 100,
            temporal_context: Math.round(score.temporal.score * 100) / 100,
            temporal_relation: score.temporal.relation,
            source_article_ids: [id, candidate.id],
          },
          _evidenceSignals: score.evidenceSignals,
        };
      })
      .filter((row) => row.link_score >= threshold)
      .filter((row) => row._evidenceSignals >= config.minEvidenceSignals)
      .sort(byStableScore);

    const relatedEvents: RelatedAssociationEvent[] = scored.slice(0, maxRelated).map((row) => ({
      article_id: row.article_id,
      headline: row.headline,
      summary: row.summary,
      source: row.source,
      published_at: row.published_at,
      sentiment: row.sentiment,
      magnitude: row.magnitude,
      dominant_type: row.dominant_type,
      link_score: row.link_score,
      explanation: row.explanation,
      evidence: row.evidence,
    }));

    const tracePaths = buildTracePaths(
      focusArticle as Article,
      relatedEvents,
      candidates as Article[],
      entityTypes,
      config,
      days,
      depth
    );

    const legacy = toLegacyGraph(focusArticle as Article, relatedEvents, tracePaths);

    return NextResponse.json({
      focus: focusArticle,
      related_events: relatedEvents,
      trace_paths: tracePaths,
      scoring_version: "associations-v2.0.0",
      applied_params: {
        time_window: timeWindow,
        sentiment,
        mode,
        depth,
        view,
        link_threshold: threshold,
        entity_types: entityTypes,
        max_related: maxRelated,
      },
      generated_at: new Date().toISOString(),
      // compatibility payload
      focusArticle,
      nodes: legacy.nodes,
      edges: legacy.edges,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
