export const TOPIC_CHIPS = [
  "All News",
  "Tech",
  "Energy",
  "Fed",
  "ECB",
  "Inflation",
  "Labor",
  "Crypto",
] as const;

export const MARKET_INSTRUMENTS: Record<string, { symbol: string; yahooSymbol: string }> = {
  "US 10Y Yield": { symbol: "US10Y", yahooSymbol: "^TNX" },
  "S&P 500":      { symbol: "SPX",   yahooSymbol: "^GSPC" },
  "EUR/USD":      { symbol: "EURUSD", yahooSymbol: "EURUSD=X" },
  "Gold":         { symbol: "XAU",    yahooSymbol: "GC=F" },
  "Brent Crude":  { symbol: "BRENT",  yahooSymbol: "BZ=F" },
  "DXY Index":    { symbol: "DXY",    yahooSymbol: "DX-Y.NYB" },
};

export const ENTITY_TYPE_COLORS: Record<string, string> = {
  focus: "#f59e0b",
  companies: "#60a5fa",
  people: "#a78bfa",
  policies: "#34d399",
  markets: "#fb923c",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  Bullish: "#00f5d4",
  Bearish: "#ff4d6d",
  Neutral: "#fb8500",
};

export const TOPIC_KEYWORDS: Record<string, string[]> = {
  Tech: ["technology", "tech", "AI", "semiconductor", "chip", "software", "NVDA", "AAPL", "MSFT", "GOOG", "META"],
  Energy: ["energy", "oil", "gas", "crude", "OPEC", "brent", "renewable", "solar", "nuclear"],
  Fed: ["federal reserve", "fed", "fomc", "powell", "rate", "monetary policy"],
  ECB: ["ecb", "european central bank", "lagarde", "eurozone"],
  Inflation: ["inflation", "CPI", "PPI", "consumer price", "deflation", "price"],
  Labor: ["labor", "employment", "jobs", "payroll", "unemployment", "wage", "NFP", "non-farm"],
  Crypto: ["crypto", "bitcoin", "ethereum", "BTC", "digital asset", "blockchain", "stablecoin"],
};

export const TIME_WINDOW_DAYS: Record<string, number> = {
  "7D": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 3650,
};
