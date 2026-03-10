"use client";

import Link from "next/link";
import type { Article } from "@/lib/types";
import SentimentBadge from "./SentimentBadge";

interface TimelineCardProps {
  article: Article;
  isHighlighted?: boolean;
  onHover?: (articleId: string | null) => void;
}

export default function TimelineCard({ article, isHighlighted, onHover }: TimelineCardProps) {
  const date = new Date(article.published_at);
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate().toString().padStart(2, "0");

  const sentimentColor =
    article.sentiment === "Bearish"
      ? "bg-[#ff4d6d]"
      : article.sentiment === "Bullish"
        ? "bg-[#00f5d4]"
        : "bg-[#fb8500]";

  const allEntities = [
    ...(article.entities_topics || []),
    ...(article.entities_markets || []),
    ...(article.entities_companies || []),
    ...(article.entities_policies || []),
  ].slice(0, 4);


  return (
    <div
      className="relative"
      data-article-id={article.id}
      onMouseEnter={() => onHover?.(article.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Date column */}
      <div className="absolute -left-[41px] top-0 flex flex-col items-center w-6">
        <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase">{month}</span>
        <span className="text-xl font-black text-white">{day}</span>
        <div
          className={`w-6 h-6 rounded-full ${sentimentColor} border-4 border-[#080b12] mt-2 z-10 transition-transform duration-200 ${isHighlighted ? "scale-125" : ""}`}
        />
      </div>

      {/* Card */}
      <div
        className={`bg-slate-900/10 border rounded-xl p-6 relative transition-all duration-200 ${
          isHighlighted
            ? "border-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.15)]"
            : "border-slate-800 hover:border-[#00d4ff]/30"
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            <SentimentBadge sentiment={article.sentiment} />
            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Mag: {article.magnitude}
            </span>
            <span className="text-[10px] font-bold text-slate-500 ml-2">{article.source}</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{article.headline}</h3>

        {article.summary && (
          <p className="text-slate-400 text-sm mb-4 line-clamp-3">{article.summary}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {allEntities.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {(article.entities_people || []).slice(0, 2).map((person) => (
              <span
                key={person}
                className="text-[10px] font-medium text-slate-500 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">person</span>
                {person}
              </span>
            ))}
            <Link
              href={`/associations?article=${article.id}`}
              className="text-[10px] font-semibold text-[#00d4ff] opacity-60 hover:opacity-100 transition-opacity"
            >
              View Associations →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
