"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import SearchPanel from "./SearchPanel";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/timeline", label: "Timeline" },
    { href: "/associations", label: "Associations" },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSearch(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSearch(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function getUserInitials(u: User | null): string {
    if (!u) return "??";
    const email = u.email ?? "";
    return email.slice(0, 2).toUpperCase();
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#1e2530] bg-[#080b12]/80 backdrop-blur-md px-6 py-3 lg:px-20 shrink-0">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 text-[#00d4ff]">
            <span className="material-symbols-outlined text-3xl font-bold">blur_on</span>
            <h2 className="text-white text-xl font-black tracking-tight">MacroTracker</h2>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive(link.href)
                    ? "text-[#00d4ff] text-sm font-semibold border-b-2 border-[#00d4ff] pb-1"
                    : "text-slate-400 hover:text-[#00d4ff] text-sm font-semibold transition-colors"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-4 flex-1 justify-center max-w-xl px-4">
          <div className="flex w-full items-stretch rounded-lg bg-slate-800 h-10 px-3">
            <span className="material-symbols-outlined self-center text-slate-500">search</span>
            <input
              ref={inputRef}
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm placeholder:text-slate-500 text-slate-200 ml-2"
              placeholder="Search markets, assets, or entities..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-3">
          <div
            title={user?.email ?? ""}
            className="h-8 w-8 rounded-full bg-[#00d4ff]/20 flex items-center justify-center text-[#00d4ff] font-bold text-xs select-none"
          >
            {getUserInitials(user)}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-slate-400 hover:text-[#00d4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </header>

      {showSearch && (
        <SearchPanel query={searchQuery} onClose={() => setShowSearch(false)} />
      )}
    </>
  );
}
