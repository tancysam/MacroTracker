import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { TWELVE_DATA_SYMBOLS, fetchDailyCandles } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  try {
    const supabase = getServiceClient();
    const results: Record<string, { inserted: number; error?: string }> = {};
    const endDate = new Date().toISOString().slice(0, 10);

    const symbols = Object.entries(TWELVE_DATA_SYMBOLS);

    for (let i = 0; i < symbols.length; i++) {
      const [dbSymbol, tdSymbol] = symbols[i];

      try {
        // Find latest date in DB for this symbol
        const { data: latest } = await supabase
          .from("market_candles")
          .select("date")
          .eq("symbol", dbSymbol)
          .order("date", { ascending: false })
          .limit(1)
          .single();

        // Fetch from day after latest, or last 30 days if no data
        const startDate = latest
          ? new Date(new Date(latest.date).getTime() + 86400000).toISOString().slice(0, 10)
          : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

        if (startDate > endDate) {
          results[dbSymbol] = { inserted: 0 };
          continue;
        }

        const candles = await fetchDailyCandles(tdSymbol, startDate, endDate);

        if (candles.length === 0) {
          results[dbSymbol] = { inserted: 0 };
          continue;
        }

        const rows = candles.map((c) => ({
          symbol: dbSymbol,
          date: c.datetime,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: c.volume ? parseInt(c.volume, 10) : null,
        }));

        const { error } = await supabase
          .from("market_candles")
          .upsert(rows, { onConflict: "symbol,date" });

        if (error) {
          results[dbSymbol] = { inserted: 0, error: error.message };
        } else {
          results[dbSymbol] = { inserted: rows.length };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results[dbSymbol] = { inserted: 0, error: msg };
      }

      // Rate limit between symbols
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
