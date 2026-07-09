import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { FINNHUB_TO_DB_SYMBOL } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = request.nextUrl;
    const symbol = searchParams.get("symbol"); // finnhubSymbol e.g. "OANDA:EUR_USD"
    const from = searchParams.get("from");     // unix timestamp (seconds)
    const to = searchParams.get("to");         // unix timestamp (seconds)

    if (!symbol || !from || !to) {
      return NextResponse.json(
        { error: "symbol, from, and to are required" },
        { status: 400 }
      );
    }

    const dbSymbol = FINNHUB_TO_DB_SYMBOL[symbol];
    if (!dbSymbol) {
      return NextResponse.json({ s: "no_data", t: [], c: [] });
    }

    // Convert unix timestamps (seconds) to ISO dates
    const fromDate = new Date(parseInt(from) * 1000).toISOString().slice(0, 10);
    const toDate = new Date(parseInt(to) * 1000).toISOString().slice(0, 10);

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("market_candles")
      .select("date, close")
      .eq("symbol", dbSymbol)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    if (error) {
      console.error("[market-data] Supabase error:", error.message);
      return NextResponse.json({ s: "no_data", t: [], c: [] });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ s: "no_data", t: [], c: [] });
    }

    // Convert to same shape PriceChart expects: { s, t (unix[]), c (number[]) }
    const t = data.map((row) => Math.floor(new Date(row.date).getTime() / 1000));
    const c = data.map((row) => parseFloat(row.close));

    return NextResponse.json({ s: "ok", t, c });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
