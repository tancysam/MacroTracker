import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { TWELVE_DATA_SYMBOLS, fetchDailyCandles } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // allow up to 2 min for all symbols

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  try {
    const supabase = getServiceClient();
    const results: Record<string, { inserted: number; error?: string }> = {};

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = "2015-01-01";

    const symbols = Object.entries(TWELVE_DATA_SYMBOLS);

    for (let i = 0; i < symbols.length; i++) {
      const [dbSymbol, tdSymbol] = symbols[i];

      try {
        const candles = await fetchDailyCandles(tdSymbol, startDate, endDate);

        if (candles.length === 0) {
          results[dbSymbol] = { inserted: 0, error: "No data returned" };
          continue;
        }

        // Batch upsert in chunks of 500
        const rows = candles.map((c) => ({
          symbol: dbSymbol,
          date: c.datetime,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: c.volume ? parseInt(c.volume, 10) : null,
        }));

        let inserted = 0;
        for (let j = 0; j < rows.length; j += 500) {
          const batch = rows.slice(j, j + 500);
          const { error } = await supabase
            .from("market_candles")
            .upsert(batch, { onConflict: "symbol,date" });

          if (error) {
            console.error(`[backfill] Upsert error for ${dbSymbol} batch ${j}:`, error.message);
          } else {
            inserted += batch.length;
          }
        }

        results[dbSymbol] = { inserted };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results[dbSymbol] = { inserted: 0, error: msg };
      }

      // Rate limit: 8 req/min on free tier → wait 8s between symbols
      if (i < symbols.length - 1) {
        await sleep(8000);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
