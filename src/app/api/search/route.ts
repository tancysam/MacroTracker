import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ articles: [] });
    }

    // Generate embedding for the query
    const embedding = await generateEmbedding(query.trim());

    // Call the match_articles RPC function
    const { data, error } = await getServiceClient().rpc("match_articles", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.3,
      match_count: 20,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
