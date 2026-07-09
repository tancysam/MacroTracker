"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [urlError, setUrlError] = useState<string | null>(null);

  // Show any error forwarded via ?error= from the auth callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("error");
    if (e) setUrlError(decodeURIComponent(e));
  }, []);

  // Handle implicit-flow tokens delivered in the URL hash fragment.
  // Supabase's default email templates put the session in #access_token=...
  // The supabase-js library detects this hash and fires SIGNED_IN automatically.
  useEffect(() => {
    // Only run if there's actually a hash with an access_token.
    if (!window.location.hash.includes("access_token=")) return;

    const supabase = createSupabaseBrowserClient();

    // Detect the flow type from the hash so we can route correctly.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get("type"); // "invite" | "recovery" | null

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // Strip the one-time token from the address bar before navigating.
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
        if (type === "invite" || type === "recovery") {
          router.push("/auth/update-password");
        } else {
          const params = new URLSearchParams(window.location.search);
          router.push(params.get("redirectTo") ?? "/");
        }
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Sign-in state
  const [email, setEmail] = useState("demo@demo.com");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot-password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      { redirectTo }
    );

    setResetLoading(false);

    if (resetErr) {
      setResetError(resetErr.message);
      return;
    }

    setResetSent(true);
  }

  return (
    <div className="min-h-screen bg-[#080b12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8 text-[#00d4ff]">
          <span className="material-symbols-outlined text-4xl font-bold">blur_on</span>
          <h1 className="text-white text-2xl font-black tracking-tight">MacroTracker</h1>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#1e2530] bg-[#0d1117] p-8">
          {urlError && (
            <div className="mb-5 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-red-300 text-sm" role="alert">
              {urlError}
            </div>
          )}
          {mode === "signin" ? (
            <>
              <h2 className="text-white text-lg font-semibold mb-1">Sign in</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your credentials to access the platform.
              </p>

              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-slate-300 text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-lg bg-slate-800 border border-[#1e2530] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/50 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-slate-300 text-sm font-medium">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-lg bg-slate-800 border border-[#1e2530] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/50 transition"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-50 disabled:cursor-not-allowed text-[#080b12] font-semibold text-sm py-2.5 transition-colors"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setError(null); setMode("forgot"); }}
                className="mt-4 w-full text-center text-slate-500 hover:text-slate-300 text-xs transition-colors"
              >
                Forgot your password?
              </button>
            </>
          ) : (
            <>
              <h2 className="text-white text-lg font-semibold mb-1">Reset password</h2>
              {resetSent ? (
                <>
                  <p className="text-slate-400 text-sm mb-6">
                    If an account exists for that email, a reset link has been sent. Check your inbox.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setResetSent(false); setResetEmail(""); setMode("signin"); }}
                    className="w-full rounded-lg border border-[#1e2530] hover:border-[#00d4ff]/40 text-slate-300 font-semibold text-sm py-2.5 transition-colors"
                  >
                    Back to sign in
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-sm mb-6">
                    Enter your email and we&apos;ll send you a link to reset your password.
                  </p>

                  <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reset-email" className="text-slate-300 text-sm font-medium">
                        Email
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="rounded-lg bg-slate-800 border border-[#1e2530] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/50 transition"
                      />
                    </div>

                    {resetError && (
                      <p className="text-red-400 text-sm" role="alert">
                        {resetError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="mt-1 rounded-lg bg-[#00d4ff] hover:bg-[#00b8e0] disabled:opacity-50 disabled:cursor-not-allowed text-[#080b12] font-semibold text-sm py-2.5 transition-colors"
                    >
                      {resetLoading ? "Sending…" : "Send reset link"}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => { setResetError(null); setMode("signin"); }}
                    className="mt-4 w-full text-center text-slate-500 hover:text-slate-300 text-xs transition-colors"
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Demo credentials */}
        <div className="mt-5 rounded-lg border border-sky-500/30 bg-sky-950/30 px-4 py-3 text-sky-100 text-xs leading-relaxed shadow-[0_0_0_1px_rgba(14,165,233,0.08)]">
          <p className="font-semibold text-sky-50">Please use the following credentials to login:</p>
          <div className="mt-3 grid gap-2 font-mono text-[11px] text-sky-100 select-all">
            <div className="rounded-md border border-sky-500/20 bg-slate-950/60 px-3 py-2">
              <span className="text-sky-300">Username:</span> demo@demo.com
            </div>
            <div className="rounded-md border border-sky-500/20 bg-slate-950/60 px-3 py-2">
              <span className="text-sky-300">Password:</span> demo
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Access is restricted to authorised users only.
        </p>
      </div>
    </div>
  );
}

