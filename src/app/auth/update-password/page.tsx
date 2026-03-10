"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function establish() {
      // Attempt client-side token exchange first, in case the server-side
      // /auth/callback couldn't run (e.g. Supabase redirected here directly).
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type") as
        | "invite" | "recovery" | "email" | "signup" | null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        // Strip the one-time code from the browser URL bar.
        window.history.replaceState({}, "", window.location.pathname);
        setChecking(false);
        return;
      }

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        window.history.replaceState({}, "", window.location.pathname);
        setChecking(false);
        return;
      }

      // No URL params — check for an existing session (set by the server callback).
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setChecking(false);
      } else {
        router.replace("/login?error=Your+reset+link+has+expired.+Please+request+a+new+one.");
      }
    }

    establish();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080b12] flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8 text-[#00d4ff]">
          <span className="material-symbols-outlined text-4xl font-bold">blur_on</span>
          <h1 className="text-white text-2xl font-black tracking-tight">MacroTracker</h1>
        </div>

        <div className="rounded-xl border border-[#1e2530] bg-[#0d1117] p-8">
          <h2 className="text-white text-lg font-semibold mb-1">Set your password</h2>
          <p className="text-slate-400 text-sm mb-6">
            Choose a secure password to protect your account.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-slate-300 text-sm font-medium">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="rounded-lg bg-slate-800 border border-[#1e2530] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/50 transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-slate-300 text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
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
              {loading ? "Saving…" : "Set password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
