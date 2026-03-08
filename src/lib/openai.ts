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
- entities_topics: string[] — Broad thematic categories (e.g., "Inflation", "Labor Market", "Geopolitics")
- entities_markets: string[] — Financial instruments/assets (e.g., "S&P 500", "Brent Crude", "US 10Y Yield")
- entities_people: string[] — Named individuals (e.g., "Jerome Powell", "Christine Lagarde")
- entities_companies: string[] — Corporations/institutions (e.g., "Goldman Sachs", "Federal Reserve", "ECB")
- entities_policies: string[] — Policy types (e.g., "Rate Hike", "QE", "Tariffs")
- sentiment: "Bullish" | "Bearish" | "Neutral" — market outlook
- magnitude: number (0-10) — significance/impact score
- primary_topic_key: string — the single most-mentioned entity tag across all entity types
- primary_topic_display: string — a human-readable topic name derived from the most-mentioned entity (e.g., "Federal Reserve Rate Policy")`,
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
