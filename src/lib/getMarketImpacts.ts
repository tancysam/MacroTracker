import type { Article, MarketImpact } from "./types";
import { inferMarketImpacts } from "./marketImpactFallback";

export function getMarketImpacts(article: Article): MarketImpact[] {
  if (article.market_impacts?.length) return article.market_impacts;
  return inferMarketImpacts(article);
}
