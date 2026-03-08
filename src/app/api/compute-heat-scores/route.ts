import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = getServiceClient();

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get mentions this week
    const { data: thisWeek } = await supabase
      .from("entity_mentions")
      .select("entity_name, entity_type")
      .gte("mentioned_at", oneWeekAgo.toISOString());

    // Get mentions last week
    const { data: lastWeek } = await supabase
      .from("entity_mentions")
      .select("entity_name, entity_type")
      .gte("mentioned_at", twoWeeksAgo.toISOString())
      .lt("mentioned_at", oneWeekAgo.toISOString());

    // Count mentions per entity
    const thisWeekCounts = new Map<string, { count: number; type: string }>();
    const lastWeekCounts = new Map<string, number>();

    for (const m of thisWeek || []) {
      const existing = thisWeekCounts.get(m.entity_name);
      if (existing) {
        existing.count++;
      } else {
        thisWeekCounts.set(m.entity_name, { count: 1, type: m.entity_type });
      }
    }

    for (const m of lastWeek || []) {
      lastWeekCounts.set(m.entity_name, (lastWeekCounts.get(m.entity_name) || 0) + 1);
    }

    // Compute HeatScores
    const scores: { entity_name: string; entity_type: string; heat_score: number }[] = [];

    for (const [name, data] of thisWeekCounts) {
      const lastCount = lastWeekCounts.get(name) || 0;
      let heatScore: number;

      if (lastCount === 0) {
        heatScore = Math.min(data.count * 10, 999);
      } else {
        heatScore = ((data.count - lastCount) / lastCount) * 100;
      }

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
