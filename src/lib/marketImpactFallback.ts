import type { Article } from "./types";
import type { MarketImpact } from "./types";

interface Rule {
  keywords: RegExp;
  asset: string;
  direction: "up" | "down" | "mixed" | "sentiment";
}

const rules: Rule[] = [
  { keywords: /\b(war|conflict|attack|military|missile|troops|invasion)\b/i, asset: "Defense Stocks", direction: "up" },
  { keywords: /\b(war|conflict|attack|missile|invasion)\b/i, asset: "Brent Crude", direction: "up" },
  { keywords: /\b(war|conflict|sanctions|geopolitical)\b/i, asset: "Gold", direction: "up" },
  { keywords: /\b(fed|fomc|rate hike|interest rate|hawkish|dovish)\b/i, asset: "US 10Y Yield", direction: "sentiment" },
  { keywords: /\b(fed|rate hike|hawkish)\b/i, asset: "S&P 500", direction: "down" },
  { keywords: /\b(oil|crude|opec|brent|petroleum)\b/i, asset: "Brent Crude", direction: "sentiment" },
  { keywords: /\b(tariff|trade war|sanctions|trade tensions)\b/i, asset: "S&P 500", direction: "down" },
  { keywords: /\b(inflation|cpi|ppi|consumer price)\b/i, asset: "US 10Y Yield", direction: "up" },
  { keywords: /\b(inflation|cpi|consumer price)\b/i, asset: "Gold", direction: "up" },
  { keywords: /\b(tech|ai|semiconductor|chip|nvidia|apple|microsoft)\b/i, asset: "Tech Stocks", direction: "sentiment" },
  { keywords: /\b(crypto|bitcoin|btc|ethereum)\b/i, asset: "Bitcoin", direction: "sentiment" },
  { keywords: /\b(euro|ecb|eurozone)\b/i, asset: "EUR/USD", direction: "sentiment" },
  { keywords: /\b(bank|banking|financial sector|credit)\b/i, asset: "Bank Stocks", direction: "sentiment" },
  { keywords: /\b(vix|volatility|fear)\b/i, asset: "VIX", direction: "up" },
  { keywords: /\b(dollar|dxy|greenback)\b/i, asset: "DXY Index", direction: "sentiment" },
];

function resolveDirection(
  ruleDirection: Rule["direction"],
  sentiment: Article["sentiment"]
): MarketImpact["direction"] {
  if (ruleDirection === "sentiment") {
    if (sentiment === "Bullish") return "up";
    if (sentiment === "Bearish") return "down";
    return "mixed";
  }
  return ruleDirection;
}

export function inferMarketImpacts(article: Article): MarketImpact[] {
  const text = [
    article.headline,
    article.summary ?? "",
    ...(article.entities_topics ?? []),
    ...(article.entities_markets ?? []),
    ...(article.entities_companies ?? []),
    ...(article.entities_policies ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const seen = new Set<string>();
  const impacts: MarketImpact[] = [];

  for (const rule of rules) {
    if (impacts.length >= 5) break;
    if (seen.has(rule.asset)) continue;
    if (rule.keywords.test(text)) {
      seen.add(rule.asset);
      impacts.push({
        asset: rule.asset,
        direction: resolveDirection(rule.direction, article.sentiment),
      });
    }
  }

  return impacts;
}
