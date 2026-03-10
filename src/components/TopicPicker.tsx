"use client";

import { useState, useMemo } from "react";
import { TOPIC_GROUPS } from "@/lib/constants";

interface TopicPickerProps {
    /** Page title shown above the picker */
    title: string;
    /** Subtitle / instruction text */
    subtitle: string;
    /** Called when a topic is selected */
    onSelect: (topic: string) => void;
}

export default function TopicPicker({ title, subtitle, onSelect }: TopicPickerProps) {
    const [search, setSearch] = useState("");
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    const query = search.toLowerCase().trim();

    const filteredGroups = useMemo(() => {
        if (!query) return TOPIC_GROUPS;
        return TOPIC_GROUPS.map((group) => {
            const groupMatches = group.label.toLowerCase().includes(query);
            const matchingTopics = group.topics.filter((t) =>
                t.toLowerCase().includes(query)
            );
            if (groupMatches) return group;
            if (matchingTopics.length > 0) return { ...group, topics: matchingTopics };
            return null;
        }).filter(Boolean) as typeof TOPIC_GROUPS;
    }, [query]);

    return (
        <div className="flex-1 flex flex-col items-center justify-start py-12 px-6 overflow-y-auto">
            <div className="max-w-3xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tight mb-2">{title}</h1>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>

                {/* Search */}
                <div className="relative max-w-md mx-auto mb-8">
                    <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search topics…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900/60 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00d4ff]/40 focus:ring-1 focus:ring-[#00d4ff]/20 transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-sm"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Groups grid */}
                {filteredGroups.length === 0 ? (
                    <p className="text-center text-slate-600 text-sm py-8">
                        No topics match &quot;{search}&quot;
                    </p>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredGroups.map((group) => {
                            const isExpanded = expandedGroup === group.label;

                            return (
                                <div
                                    key={group.label}
                                    className={`rounded-xl border transition-all duration-200 ${isExpanded
                                            ? "border-[#00d4ff]/30 bg-[#0b0e14] col-span-full"
                                            : "border-[#1e2530] bg-[#0b0e14] hover:border-slate-600"
                                        }`}
                                >
                                    {/* Group header */}
                                    <button
                                        onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <svg
                                                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""
                                                    }`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                            <span className="text-sm font-semibold text-slate-200">{group.label}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-600 font-medium">
                                            {group.topics.length} topics
                                        </span>
                                    </button>

                                    {/* Expanded subtopics */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-1 border-t border-[#1e2530]">
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {group.topics.map((topic) => (
                                                    <button
                                                        key={topic}
                                                        onClick={() => onSelect(topic)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-[#00d4ff]/15 hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all duration-150"
                                                    >
                                                        {topic}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
