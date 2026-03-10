import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { pathname, searchParams } = request.nextUrl;

  // Supabase may redirect auth callbacks to the Site URL root (not /auth/callback)
  // when the allowed-redirect-URLs list isn't configured in the dashboard.
  // If auth params land on a non-auth path, forward them to the callback handler.
  const hasAuthParams = searchParams.has("code") || searchParams.has("token_hash");
  if (hasAuthParams && !pathname.startsWith("/auth/")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  // Always call getUser() — this refreshes the session cookie if it has expired.
  // IMPORTANT: do not use getSession() here as it is not authenticated server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public paths that never require authentication
  const isAuthPath =
    pathname.startsWith("/login") || pathname.startsWith("/auth/");

  if (!user && !isAuthPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const redirectTo =
      request.nextUrl.searchParams.get("redirectTo") ?? "/";
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = redirectTo;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
