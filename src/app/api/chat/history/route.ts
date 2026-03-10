import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET /api/chat/history — list all sessions for the authenticated user
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}

// POST /api/chat/history — create or upsert a session
// Body: { id?: string; title: string; messages: Message[] }
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title: string = typeof body?.title === "string" && body.title.trim()
    ? body.title.trim().slice(0, 200)
    : "New conversation";
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const existingId: string | undefined = typeof body?.id === "string" ? body.id : undefined;

  if (existingId) {
    // Update existing session
    const { data, error } = await supabase
      .from("chat_sessions")
      .update({ title, messages, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .eq("user_id", user.id)
      .select("id, title, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session: data });
  }

  // Create new session
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id, title, messages })
    .select("id, title, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}
