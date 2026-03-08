import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export interface ExtractionResult {
  is_relevant: boolean;
  entities_topics: string[];
  entities_markets: string[];
  entities_people: string[];
  entities_companies: string[];
  entities_policies: string[];
  sentiment: "Bullish" | "Bearish" | "Neutral";
  magnitude: number;
  primary_topic_key: string;
  primary_topic_display: string;
}

export async function extractArticleMetadata(
  headline: string,
  summary: string
): Promise<ExtractionResult> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a financial news analyst. Extract structured metadata from the given news article.

Return a JSON object with these exact fields:
- is_relevant: boolean — Set to TRUE only if this is a concrete, factual news article with direct financial market implications: economic data releases, central bank decisions, corporate earnings/M&A/IPOs, regulatory rulings, commodity/currency moves, or geopolitical events that affect asset prices. Set to FALSE for: opinion pieces, advice columns, listicles, lifestyle or health content, personal finance tips, vague weekly recaps without specific data/events, and any article whose primary purpose is commentary or entertainment rather than reporting a concrete event. Examples of FALSE: "3 confidence-building tools for parents", "When to talk to AI about mental health", "Here are 3 themes that drove another challenging week on Wall Street". Examples of TRUE: "Fed raises rates by 25bps", "Apple beats Q3 earnings estimates", "OPEC+ cuts output by 1M barrels/day".
- entities_topics: string[] — Specific thematic categories tied to a named event or policy shift (e.g., "Fed Rate Hike", "US-China Trade Tensions", "Oil Supply Cut", "Banking Crisis", "NATO Expansion", "Middle East Conflict"). Do NOT include vague umbrella terms like "Geopolitics", "Global Markets", or "Economy".
- entities_markets: string[] — Financial instruments/assets (e.g., "S&P 500", "Brent Crude", "US 10Y Yield")
- entities_people: string[] — Named individuals (e.g., "Jerome Powell", "Christine Lagarde")
- entities_companies: string[] — Corporations/institutions (e.g., "Goldman Sachs", "Federal Reserve", "ECB")
- entities_policies: string[] — Policy types (e.g., "Rate Hike", "QE", "Tariffs")
- sentiment: "Bullish" | "Bearish" | "Neutral" — market outlook
- magnitude: number (0-10) — significance/impact score
- primary_topic_key: string — the single most-mentioned entity tag across all entity types
- primary_topic_display: string — a human-readable topic name derived from the most-mentioned entity (e.g., "Federal Reserve Rate Policy")

IMPORTANT: Do NOT include news agencies, wire services, or media organizations (e.g., Reuters, Bloomberg, AP, CNBC) in any entity category.`,
      },
      {
        role: "user",
        content: `Headline: ${headline}\n\nSummary: ${summary || "No summary available."}`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return JSON.parse(content) as ExtractionResult;
}
