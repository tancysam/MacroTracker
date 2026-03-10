import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { TRENDING_BLOCKLIST } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = getServiceClient();

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get mentions this week (with timestamps for recency weighting)
    const { data: thisWeek } = await supabase
      .from("entity_mentions")
      .select("entity_name, entity_type, mentioned_at")
      .gte("mentioned_at", oneWeekAgo.toISOString());

    // Get mentions last week (flat count — baseline only)
    const { data: lastWeek } = await supabase
      .from("entity_mentions")
      .select("entity_name, entity_type")
      .gte("mentioned_at", twoWeeksAgo.toISOString())
      .lt("mentioned_at", oneWeekAgo.toISOString());

    // Recency-weighted count for this week
    // Daily decay of 0.85: today=1.0, 1d ago=0.85, 2d=0.72, 3d=0.61, 7d=0.32
    const DAILY_DECAY = 0.85;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const thisWeekCounts = new Map<string, { weighted: number; type: string }>();
    const lastWeekCounts = new Map<string, number>();

    for (const m of thisWeek || []) {
      const daysAgo = (now.getTime() - new Date(m.mentioned_at).getTime()) / MS_PER_DAY;
      const weight = Math.pow(DAILY_DECAY, daysAgo);
      const existing = thisWeekCounts.get(m.entity_name);
      if (existing) {
        existing.weighted += weight;
      } else {
        thisWeekCounts.set(m.entity_name, { weighted: weight, type: m.entity_type });
      }
    }

    for (const m of lastWeek || []) {
      lastWeekCounts.set(m.entity_name, (lastWeekCounts.get(m.entity_name) || 0) + 1);
    }

    // Compute HeatScores
    const scores: { entity_name: string; entity_type: string; heat_score: number }[] = [];

    for (const [name, data] of thisWeekCounts) {
      if (TRENDING_BLOCKLIST.has(name)) continue;
      const lastCount = lastWeekCounts.get(name) || 0;
      const heatScore = (data.weighted - lastCount) * Math.log(1 + data.weighted);

      scores.push({
        entity_name: name,
        entity_type: data.type,
        heat_score: Math.round(heatScore * 100) / 100,
      });
    }

    // Upsert into heat_scores table
    if (scores.length > 0) {
      await supabase
        .from("heat_scores")
        .upsert(
          scores.map((s) => ({
            entity_name: s.entity_name,
            entity_type: s.entity_type,
            heat_score: s.heat_score,
            computed_at: now.toISOString(),
          })),
          { onConflict: "entity_name" }
        );
    }

    return NextResponse.json({ success: true, computed: scores.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
