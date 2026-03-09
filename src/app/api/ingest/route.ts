import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { fetchGeneralNews } from "@/lib/finnhub";
import { extractArticleMetadata, generateEmbedding } from "@/lib/openai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = getServiceClient();
    const news = await fetchGeneralNews();

    const results = { inserted: 0, skipped: 0, filtered: 0, errors: 0, errorSamples: [] as string[] };

    // Process in batches of 10
    const batchSize = 10;
    const items = news.slice(0, 30); // Max 30 articles per run

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const urlHash = createHash("sha256").update(item.url).digest("hex");

            // Attempt insert with dedup
            const { data: inserted, error: insertError } = await supabase
              .from("articles")
              .insert({
                url: item.url,
                url_hash: urlHash,
                headline: item.headline,
                summary: item.summary || null,
                source: item.source || null,
                image_url: item.image || null,
                published_at: new Date(item.datetime * 1000).toISOString(),
              })
              .select("id")
              .single();

            if (insertError) {
              // Duplicate — url_hash conflict
              if (insertError.code === "23505") {
                results.skipped++;
                return;
              }
              throw insertError;
            }

            const articleId = inserted.id;

            // Extract metadata via OpenAI
            const metadata = await extractArticleMetadata(
              item.headline,
              item.summary || ""
            );

            // Prune irrelevant articles (opinion pieces, advice columns, etc.)
            if (!metadata.is_relevant) {
              await supabase.from("articles").delete().eq("id", articleId);
              results.filtered++;
              return;
            }

            // Generate embedding
            const embeddingText = `${item.headline}. ${item.summary || ""}`;
            const embedding = await generateEmbedding(embeddingText);

            // Update article with metadata + embedding
            await supabase
              .from("articles")
              .update({
                sentiment: metadata.sentiment,
                magnitude: metadata.magnitude,
                primary_topic_key: metadata.primary_topic_key,
                primary_topic_display: metadata.primary_topic_display,
                entities_topics: metadata.entities_topics,
                entities_markets: metadata.entities_markets,
                entities_people: metadata.entities_people,
                entities_companies: metadata.entities_companies,
                entities_policies: metadata.entities_policies,
                market_impacts: metadata.market_impacts ?? null,
                taxonomy_tags: metadata.taxonomy_tags || [],
                embedding: JSON.stringify(embedding),
              })
              .eq("id", articleId);

            // Insert entity mentions
            const mentions: { entity_name: string; entity_type: string; article_id: string; mentioned_at: string }[] = [];
            const publishedAt = new Date(item.datetime * 1000).toISOString();

            const entityMap: Record<string, string[]> = {
              Topics: metadata.entities_topics,
              Markets: metadata.entities_markets,
              People: metadata.entities_people,
              Companies: metadata.entities_companies,
              Policies: metadata.entities_policies,
            };

            for (const [type, entities] of Object.entries(entityMap)) {
              for (const entity of entities) {
                mentions.push({
                  entity_name: entity,
                  entity_type: type,
                  article_id: articleId,
                  mentioned_at: publishedAt,
                });
              }
            }

            if (mentions.length > 0) {
              await supabase.from("entity_mentions").insert(mentions);
            }

            results.inserted++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[ingest] article error:", msg);
            if (results.errorSamples.length < 3) results.errorSamples.push(msg);
            results.errors++;
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      ...results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Also support GET for cron jobs (Vercel cron hits with GET)
export async function GET() {
  return POST();
}
