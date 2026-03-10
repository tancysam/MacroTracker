"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import NavHeader from "@/components/NavHeader";
import SentimentBadge from "@/components/SentimentBadge";
import { getMarketImpacts } from "@/lib/getMarketImpacts";
import type { Article } from "@/lib/types";

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/articles/${id}`)
            .then((res) => res.json())
            .then((data) => setArticle(data.article || null))
            .catch(() => setArticle(null))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                <NavHeader />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-slate-500">Loading article…</div>
                </main>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                <NavHeader />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-slate-500">Article not found.</div>
                </main>
            </div>
        );
    }

    const impacts = getMarketImpacts(article);
    const timeAgo = formatDistanceToNow(new Date(article.published_at), { addSuffix: true });

    const tagSections: { label: string; items: string[]; color: string; type: string }[] = [
        {
            label: "Topics",
            items: article.entities_topics || [],
            color: "border-amber-500/30 text-amber-300 hover:bg-amber-500/10",
            type: "topic",
        },
        {
            label: "Markets & Shifts",
            items: article.entities_markets || [],
            color: "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10",
            type: "topic",
        },
        {
            label: "Companies",
            items: article.entities_companies || [],
            color: "border-blue-400/30 text-blue-300 hover:bg-blue-400/10",
            type: "topic",
        },
        {
            label: "People",
            items: article.entities_people || [],
            color: "border-purple-400/30 text-purple-300 hover:bg-purple-400/10",
            type: "topic",
        },
        {
            label: "Policies",
            items: article.entities_policies || [],
            color: "border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10",
            type: "topic",
        },
    ].filter((s) => s.items.length > 0);

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
            <NavHeader />
            <main className="flex-1 overflow-y-auto bg-[#080b12] py-10 px-6">
                <div className="max-w-3xl mx-auto">
                    {/* Back link */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-white mb-6 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-bold text-slate-300">{article.source}</span>
                            <span className="text-xs text-slate-600">•</span>
                            <span className="text-xs text-slate-500">{timeAgo}</span>
                            <span className="text-xs text-slate-600">•</span>
                            <span className="text-xs text-slate-500">
                                {new Date(article.published_at).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
                            {article.headline}
                        </h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <SentimentBadge sentiment={article.sentiment} />
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 text-xs font-bold border border-amber-500/20">
                                Magnitude {article.magnitude}
                            </span>
                            {article.primary_topic_display && (
                                <span className="px-2.5 py-1 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] text-xs font-semibold border border-[#00d4ff]/20">
                                    {article.primary_topic_display}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Image */}
                    {article.image_url && (
                        <div className="mb-8 rounded-xl overflow-hidden border border-slate-800/50">
                            <img
                                src={article.image_url}
                                alt=""
                                className="w-full h-64 object-cover"
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Summary */}
                    {article.summary && (
                        <div className="mb-8 bg-[#0b0e14] border border-[#1e2530] rounded-xl p-5">
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Summary</h2>
                            <p className="text-sm text-slate-300 leading-relaxed">{article.summary}</p>
                        </div>
                    )}

                    {/* Market Impacts */}
                    {impacts.length > 0 && (
                        <div className="mb-8 bg-[#0b0e14] border border-[#1e2530] rounded-xl p-5">
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                Potential Market Impacts
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {impacts.map((i) => (
                                    <Link
                                        key={i.asset}
                                        href={`/timeline?topic=${encodeURIComponent(i.asset)}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 border border-slate-700/50 hover:border-[#00d4ff]/40 transition-colors"
                                    >
                                        <span
                                            className={
                                                i.direction === "up"
                                                    ? "text-emerald-400"
                                                    : i.direction === "down"
                                                        ? "text-red-400"
                                                        : "text-amber-400"
                                            }
                                        >
                                            {i.direction === "up" ? "▲" : i.direction === "down" ? "▼" : "◆"}
                                        </span>
                                        <span className="text-slate-200">{i.asset}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entity Tags */}
                    {tagSections.length > 0 && (
                        <div className="mb-8 bg-[#0b0e14] border border-[#1e2530] rounded-xl p-5 space-y-5">
                            {tagSections.map((section) => (
                                <div key={section.label}>
                                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                        {section.label}
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {section.items.map((tag) => (
                                            <Link
                                                key={tag}
                                                href={`/timeline?topic=${encodeURIComponent(tag)}`}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${section.color}`}
                                            >
                                                {tag}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mb-8">
                        <Link
                            href={`/timeline?topic=${encodeURIComponent(article.primary_topic_key || article.entities_topics?.[0] || "")}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/80 border border-slate-700/50 text-white hover:border-[#00d4ff]/50 hover:bg-[#00d4ff]/10 transition-all"
                        >
                            <svg className="w-4 h-4 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            View Timeline
                        </Link>
                        <Link
                            href={`/associations?article=${article.id}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Investigate Associations
                        </Link>
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Read Original
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
