import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Handles Supabase Auth callback for:
 *  - Email invitation links  (token_hash + type=invite)
 *  - Password reset links    (token_hash + type=recovery)
 *  - PKCE OAuth code flow    (code param — not used here but handled for completeness)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "invite"
    | "recovery"
    | "email"
    | "signup"
    | null;

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
    // PKCE code flow is used for password reset — send user to set their password.
    return NextResponse.redirect(`${origin}/auth/update-password`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
    // Invite and recovery flows both require the user to set/update their password.
    if (type === "invite" || type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/update-password`);
    }
    return NextResponse.redirect(`${origin}/`);
  }

  // Fallback — invalid callback URL
  return NextResponse.redirect(`${origin}/login?error=invalid_callback`);
}
