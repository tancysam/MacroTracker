"use client";

import Link from "next/link";
import type { Article } from "@/lib/types";
import SentimentBadge from "./SentimentBadge";

export default function FocusArticleBar({ article }: { article: Article }) {
  return (
    <div className="bg-[#0b0e14] border-b border-[#30363d] px-8 py-3 flex items-center gap-6 shrink-0">
      <Link
        href="/"
        className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shrink-0"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back
      </Link>
      <div className="w-px h-6 bg-[#30363d] shrink-0" />
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
        <span className="font-mono text-[10px] text-amber-500/80 font-bold tracking-widest uppercase">
          Focus Article
        </span>
      </div>
      <div className="w-px h-6 bg-[#30363d] shrink-0" />
      <span className="text-[13px] font-semibold text-slate-200 truncate flex-1">
        {article.headline}
      </span>
      <div className="flex items-center gap-6 shrink-0">
        <span className="font-mono text-[11px] text-slate-500 uppercase">
          {article.source} · {new Date(article.published_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-slate-500 uppercase">Mag</span>
          <span className="text-sm font-bold text-amber-500">{article.magnitude}</span>
        </div>
        <SentimentBadge sentiment={article.sentiment} />
      </div>
    </div>
  );
}
