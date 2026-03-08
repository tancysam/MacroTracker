"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Article } from "@/lib/types";
import SentimentBadge from "./SentimentBadge";

export default function NewsCard({ article }: { article: Article }) {
  const allEntities = [
    ...article.entities_topics,
    ...article.entities_markets,
    ...article.entities_companies,
    ...article.entities_policies,
  ].slice(0, 4);

  const timeAgo = formatDistanceToNow(new Date(article.published_at), { addSuffix: true });

  return (
    <div
      className="bg-slate-900/20 p-5 rounded-xl border border-slate-800/50 shadow-sm hover:border-[#00d4ff]/50 transition-all cursor-pointer group"
      onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
    >
      <div className="flex gap-6">
        {article.image_url && (
          <div className="w-40 h-24 rounded-lg bg-slate-700 shrink-0 overflow-hidden relative">
            <img
              className="w-full h-full object-cover"
              src={article.image_url}
              alt=""
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-bold text-slate-300">{article.source}</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
            <div className="flex gap-1">
              <SentimentBadge sentiment={article.sentiment} />
              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-[10px] font-bold">
                Mag {article.magnitude}
              </span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-[#00d4ff] transition-colors truncate">
            {article.headline}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {allEntities.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded bg-slate-700 text-slate-400 text-[10px] font-medium"
                >
                  #{tag.replace(/\s+/g, "")}
                </span>
              ))}
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
              <Link
                href={`/timeline?topic=${encodeURIComponent(article.primary_topic_key || "")}`}
                className="text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer border border-slate-700 px-2 py-0.5 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Timeline →
              </Link>
              <Link
                href={`/associations?article=${article.id}`}
                className="text-[10px] font-semibold text-[#00d4ff] cursor-pointer border border-[#00d4ff]/40 px-2 py-0.5 rounded hover:bg-[#00d4ff]/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Associations →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
