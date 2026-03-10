"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import SearchPanel from "./SearchPanel";
import ChatHistoryPanel from "./ChatHistoryPanel";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { CHAT_HISTORY_RESTORE_EVENT } from "./ChatBot";

export default function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
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

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showProfileMenu]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    }
    if (showMobileMenu) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showMobileMenu]);

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
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-[#1e2530] bg-[#080b12]/80 backdrop-blur-md px-6 py-3 lg:px-20 shrink-0">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-3 shrink-0 lg:flex-1 lg:gap-6">
          {/* Hamburger — visible below lg */}
          <div className="relative lg:hidden" ref={mobileMenuRef}>
            <button
              onClick={() => setShowMobileMenu((v) => !v)}
              aria-label="Navigation menu"
              aria-expanded={showMobileMenu}
              className="flex items-center justify-center h-8 w-8 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">{showMobileMenu ? "close" : "menu"}</span>
            </button>

            {showMobileMenu && (
              <div className="absolute left-0 top-full mt-2 w-44 bg-[#0d1117] border border-[#1e2530] rounded-xl shadow-2xl shadow-black/60 py-1 z-50">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={
                      isActive(link.href)
                        ? "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#00d4ff] bg-[#111520]"
                        : "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-[#111520] transition-colors"
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/" className="flex items-center gap-3 text-[#00d4ff]">
            <span className="material-symbols-outlined text-3xl font-bold">blur_on</span>
            <h2 className="text-white text-xl font-black tracking-tight">MacroTracker</h2>
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
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

        {/* Center: search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-2xl lg:mx-auto px-2">
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

        {/* Right: profile */}
        <div className="flex items-center gap-3 shrink-0 lg:flex-1 lg:justify-end">
          {/* Avatar — click to open profile dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              title={user?.email ?? ""}
              aria-label="Profile menu"
              aria-expanded={showProfileMenu}
              className="h-8 w-8 rounded-full bg-[#00d4ff]/20 hover:bg-[#00d4ff]/35 border border-[#00d4ff]/20 hover:border-[#00d4ff]/50 flex items-center justify-center text-[#00d4ff] font-bold text-xs select-none transition-all cursor-pointer"
            >
              {getUserInitials(user)}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0d1117] border border-[#1e2530] rounded-xl shadow-2xl shadow-black/60 py-1 z-50 animate-[slideUp_0.12s_ease-out]">
                {/* User info */}
                <div className="px-4 py-2.5 border-b border-[#1e2530]">
                  <p className="text-[11px] text-slate-500 truncate">{user?.email ?? ""}</p>
                </div>

                {/* History */}
                <button
                  onClick={() => { setShowProfileMenu(false); setShowHistory(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-[#111520] transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-[#00d4ff]">history</span>
                  Chat history
                </button>

                {/* Sign out */}
                <button
                  onClick={() => { setShowProfileMenu(false); handleSignOut(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-[#111520] transition-colors rounded-b-xl"
                >
                  <span className="material-symbols-outlined text-base text-slate-400">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showSearch && (
        <SearchPanel query={searchQuery} onClose={() => setShowSearch(false)} />
      )}
      {showHistory && (
        <ChatHistoryPanel
          onClose={() => setShowHistory(false)}
          onRestore={(sessionId) => {
            window.dispatchEvent(new CustomEvent(CHAT_HISTORY_RESTORE_EVENT, { detail: sessionId }));
          }}
        />
      )}
    </>
  );
}
