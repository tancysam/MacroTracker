import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateEmbedding } from "@/lib/openai";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RetrievedArticle {
  id: string;
  headline: string;
  summary: string | null;
  source: string | null;
  published_at: string;
  sentiment: string | null;
  magnitude: number | null;
  primary_topic_key: string | null;
  similarity: number;
  rank_score?: number;
}

const CHAT_MODEL_MAIN = process.env.CHAT_MODEL_MAIN || "gpt-4o-mini";
const CHAT_MODEL_FALLBACK = process.env.CHAT_MODEL_FALLBACK || "gpt-4o-mini";

function parseNumberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const RAG_MATCH_THRESHOLD = parseNumberEnv(process.env.CHAT_RAG_MATCH_THRESHOLD, 0.2);
const RAG_STRONG_MATCH_THRESHOLD = parseNumberEnv(process.env.CHAT_RAG_STRONG_MATCH_THRESHOLD, 0.33);
const RAG_MATCH_COUNT = Math.max(1, Math.floor(parseNumberEnv(process.env.CHAT_RAG_MATCH_COUNT, 30)));
const RAG_CONTEXT_COUNT = Math.max(1, Math.floor(parseNumberEnv(process.env.CHAT_RAG_CONTEXT_COUNT, 6)));

const SYSTEM_PROMPT = `You are MacroTracker AI, an intelligent assistant embedded in a macroeconomic news intelligence platform designed for asset managers and financial professionals.

You help users with:
1. Answering questions about macroeconomics, markets, geopolitics, commodities, FX, credit, equities, and related topics.
2. Navigating the MacroTracker platform by providing direct links to the right pages.

## Platform Navigation

The platform has these pages:

- **Dashboard** (\`/\`) - Main news feed with Focus Topics filter sidebar, trending entities panel, and news cards.
- **Article Detail** (\`/article/[id]\`) - Detailed view of a specific article with summary, market impacts, entity tags, and links to timeline/associations.
- **Timeline** (\`/timeline?topic=[TOPIC]\`) - Shows a price chart and chronological news timeline for a specific topic.
- **Associations** (\`/associations?article=[ARTICLE_ID]\`) - Investigation view showing linked events, evidence trails, and an association graph.

## Response Guidelines
- Be concise and professional. Keep answers focused and actionable.
- For article-specific claims, rely on provided retrieval context.
- If retrieval context has no strong matches, explicitly say no strong recent matches were found, then provide a general framework answer.
- When suggesting app navigation, provide markdown links like [link text](/path).
- Do not fabricate article facts that are not present in context.`;

function toSafeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m): m is { role: unknown; content: unknown } => !!m && typeof m === "object")
    .map((m) => ({ role: m.role, content: m.content }))
    .filter((m): m is ChatMessage =>
      (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0
    );
}

function isLatestIntent(query: string): boolean {
  return /(latest|recent|newest|today|what'?s new|what is new|breaking|just happened)/i.test(query);
}

function computeRecencyBoost(publishedAt: string): number {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = Math.max(ageMs / (1000 * 60 * 60), 0);
  return Math.exp(-ageHours / 72);
}

async function retrieveArticles(query: string): Promise<RetrievedArticle[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const embedding = await generateEmbedding(trimmed);
  const { data, error } = await getServiceClient().rpc("match_articles", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: RAG_MATCH_THRESHOLD,
    match_count: RAG_MATCH_COUNT,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  const retrieved = (data || []) as RetrievedArticle[];
  const latestIntent = isLatestIntent(trimmed);
  const recencyWeight = latestIntent ? 0.35 : 0.15;

  return retrieved
    .map((a) => ({
      ...a,
      rank_score: (a.similarity || 0) + computeRecencyBoost(a.published_at) * recencyWeight,
    }))
    .sort((a, b) => (b.rank_score || 0) - (a.rank_score || 0));
}

function buildRetrievalContext(articles: RetrievedArticle[]): string {
  if (articles.length === 0) return "No retrieved articles.";

  return articles
    .slice(0, RAG_CONTEXT_COUNT)
    .map((a, i) => {
      const published = new Date(a.published_at).toISOString();
      return [
        `[${i + 1}]`,
        `id: ${a.id}`,
        `headline: ${a.headline}`,
        `source: ${a.source || "unknown"}`,
        `published_at: ${published}`,
        `sentiment: ${a.sentiment || "unknown"}`,
        `magnitude: ${a.magnitude ?? "unknown"}`,
        `topic: ${a.primary_topic_key || "unknown"}`,
        `similarity: ${(a.similarity || 0).toFixed(3)}`,
        `summary: ${a.summary || ""}`,
        `article_link: /article/${a.id}`,
      ].join("\n");
    })
    .join("\n\n");
}

async function generateChatCompletion(params: {
  model: string;
  messages: ChatMessage[];
  retrievalContext: string;
  noStrongMatches: boolean;
}): Promise<string> {
  const { model, messages, retrievalContext, noStrongMatches } = params;

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Current date and time (UTC): ${new Date().toISOString()}` },
      {
        role: "system",
        content: `Retrieved context (most relevant first):\n\n${retrievalContext}\n\nNo strong matches: ${noStrongMatches ? "yes" : "no"}.`,
      },
      ...messages.slice(-20),
    ],
    max_completion_tokens: 1024,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

export async function POST(request: NextRequest) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const messages = toSafeMessages(body?.messages);

    if (messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    let retrievedArticles: RetrievedArticle[] = [];
    try {
      retrievedArticles = await retrieveArticles(lastUserMessage);
    } catch (retrievalError) {
      console.error("[chat] Retrieval error:", retrievalError);
      retrievedArticles = [];
    }

    const contextArticles = retrievedArticles.slice(0, RAG_CONTEXT_COUNT);
    const bestSimilarity = contextArticles[0]?.similarity || 0;
    const noStrongMatches = contextArticles.length === 0 || bestSimilarity < RAG_STRONG_MATCH_THRESHOLD;
    const retrievalContext = buildRetrievalContext(contextArticles);

    let content = "";
    let usedModel = CHAT_MODEL_MAIN;

    try {
      content = await generateChatCompletion({
        model: CHAT_MODEL_MAIN,
        messages,
        retrievalContext,
        noStrongMatches,
      });
    } catch (mainModelError) {
      console.error("[chat] Main model error:", mainModelError);
      usedModel = CHAT_MODEL_FALLBACK;
      try {
        content = await generateChatCompletion({
          model: CHAT_MODEL_FALLBACK,
          messages,
          retrievalContext,
          noStrongMatches,
        });
      } catch (fallbackModelError) {
        console.error("[chat] Fallback model error:", fallbackModelError);
        const errorMsg = fallbackModelError instanceof Error ? fallbackModelError.message : "Model unavailable";
        return NextResponse.json({ message: `I encountered an error: ${errorMsg}. Please try again.`, model: usedModel, error: true }, { status: 200 });
      }
    }

    if (!content) {
      const fallbackMessage = noStrongMatches
        ? "I couldn't find strong recent matches in the news database for that query. I can still help with a general market framework if you want."
        : "I couldn't generate a response from the model.";
      return NextResponse.json({ message: fallbackMessage, model: usedModel });
    }

    return NextResponse.json({ message: content, model: usedModel });
  } catch (error: unknown) {
    console.error("[chat] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: `I ran into an error: ${message}. Please try again.`, error: true, model: "error" }, { status: 200 });
  }
}
