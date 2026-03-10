import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

const SYSTEM_PROMPT = `You are MacroTracker AI, an intelligent assistant embedded in a macroeconomic news intelligence platform designed for asset managers and financial professionals.

You help users with:
1. Answering questions about macroeconomics, markets, geopolitics, commodities, FX, credit, equities, and related topics.
2. Navigating the MacroTracker platform by providing direct links to the right pages.

## Platform Navigation

The platform has these pages:

- **Dashboard** (\`/\`) — Main news feed with Focus Topics filter sidebar, trending entities panel, and news cards. Articles can be filtered by topics and sorted by HeatScore, Recency, or Composite.
- **Article Detail** (\`/article/[id]\`) — Detailed view of a specific article with summary, market impacts, entity tags, and links to timeline/associations.
- **Timeline** (\`/timeline?topic=[TOPIC]\`) — Shows a price chart and chronological news timeline for a specific topic. Examples:
  - /timeline?topic=Technology
  - /timeline?topic=Gold
  - /timeline?topic=Brent%20Crude
  - /timeline?topic=US-China%20Relations
  - /timeline?topic=Federal%20Reserve
  - /timeline?topic=Russia-Ukraine
- **Associations** (\`/associations?article=[ARTICLE_ID]\`) — Investigation view showing linked events, evidence trails, and an association graph for a specific article.

## Available Topic Categories
Equity Sectors, Foreign Exchange, Commodities, Credit & Banking, Geopolitics & Macro Risk, Fiscal Policy & Government, Emerging Markets, Private Markets, Real Estate, Regulation & Policy, ESG & Sustainability.

## Response Guidelines
- Be concise and professional. Keep answers focused and actionable.
- When suggesting a page, provide it as a markdown link: [link text](/path). The frontend will render these as clickable navigation links.
- When asked about market topics, provide insightful analysis and suggest relevant timelines to explore.
- Use bullet points for clarity when listing multiple items.
- If you don't know something specific about current market conditions, say so honestly while still providing general framework knowledge.`;

export async function POST(request: NextRequest) {
    try {
        const { messages } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "messages array is required" }, { status: 400 });
        }

        const response = await getOpenAI().chat.completions.create({
            model: "gpt-5-nano-2025-08-07",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.slice(-20), // keep last 20 messages for context
            ],
            max_completion_tokens: 1024,
        });

        const content = response.choices[0].message.content || "Sorry, I couldn't generate a response.";

        return NextResponse.json({ message: content });
    } catch (error: unknown) {
        console.error("[chat] Error:", error);
        let message = "Unknown error";
        if (error instanceof Error) {
            message = error.message;
        }
        // Return error details for debugging but keep 500 status
        return NextResponse.json({ error: message, message: `I ran into an error: ${message}` }, { status: 200 });
    }
}
