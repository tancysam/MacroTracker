"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { TOPIC_GROUPS } from "@/lib/constants";

interface TopicChipsProps {
  selected: string[];
  onSelect: (topics: string[]) => void;
}

export default function TopicChips({ selected, onSelect }: TopicChipsProps) {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const query = search.toLowerCase().trim();

  // Filter groups and topics by search query
  const filteredGroups = useMemo(() => {
    if (!query) return TOPIC_GROUPS;
    return TOPIC_GROUPS.map((group) => {
      const groupMatches = group.label.toLowerCase().includes(query);
      const matchingTopics = group.topics.filter((t) =>
        t.toLowerCase().includes(query)
      );
      if (groupMatches) return group; // show entire group
      if (matchingTopics.length > 0)
        return { ...group, topics: matchingTopics };
      return null;
    }).filter(Boolean) as typeof TOPIC_GROUPS;
  }, [query]);

  // Auto-expand groups that match search
  useEffect(() => {
    if (query) {
      setExpandedGroups(new Set(filteredGroups.map((g) => g.label)));
    }
  }, [query, filteredGroups]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleTopic = (topic: string) => {
    if (selected.includes(topic)) {
      onSelect(selected.filter((t) => t !== topic));
    } else {
      onSelect([...selected, topic]);
    }
  };

  const removeTopic = (topic: string) => {
    onSelect(selected.filter((t) => t !== topic));
  };

  const selectAllInGroup = (topics: string[]) => {
    const allSelected = topics.every((t) => selected.includes(t));
    if (allSelected) {
      onSelect(selected.filter((t) => !topics.includes(t)));
    } else {
      const merged = new Set([...selected, ...topics]);
      onSelect(Array.from(merged));
    }
  };

  return (
    <div className="flex flex-col gap-3 overflow-hidden h-full">
      {/* Header */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Focus Topics
      </h3>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/60 border border-slate-700/60 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00d4ff]/40 focus:ring-1 focus:ring-[#00d4ff]/20 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Selected Pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {selected.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#00d4ff]/15 text-[#00d4ff] text-[10px] font-semibold border border-[#00d4ff]/20"
            >
              <span className="truncate max-w-[100px]" title={topic}>
                {topic}
              </span>
              <button
                onClick={() => removeTopic(topic)}
                className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-[#00d4ff]/30 transition-colors text-[10px] leading-none"
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={() => onSelect([])}
            className="text-[10px] text-slate-500 hover:text-red-400 transition-colors font-medium px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Group List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 min-h-0">
        {filteredGroups.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">
            No topics match &quot;{search}&quot;
          </p>
        )}
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          const selectedCount = group.topics.filter((t) =>
            selected.includes(t)
          ).length;
          const allSelected =
            group.topics.length > 0 &&
            group.topics.every((t) => selected.includes(t));

          return (
            <div key={group.label}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-slate-800/60 transition-colors group"
              >
                {/* Chevron */}
                <svg
                  className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white flex-1 transition-colors">
                  {group.label}
                </span>
                {selectedCount > 0 && (
                  <span className="text-[9px] font-bold bg-[#00d4ff]/20 text-[#00d4ff] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {selectedCount}
                  </span>
                )}
              </button>

              {/* Subtopics */}
              {isExpanded && (
                <div className="ml-3 pl-2 border-l border-slate-800/60 space-y-0.5 pb-1">
                  {/* Select all for this group */}
                  <button
                    onClick={() => selectAllInGroup(group.topics)}
                    className={`w-full text-left px-2 py-1 rounded text-[10px] font-medium transition-colors ${allSelected
                        ? "text-[#00d4ff] hover:text-[#00d4ff]/80"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                  {group.topics.map((topic) => {
                    const isSelected = selected.includes(topic);
                    return (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${isSelected
                            ? "bg-[#00d4ff]/10 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                          }`}
                      >
                        {/* Checkbox */}
                        <span
                          className={`flex items-center justify-center w-3.5 h-3.5 rounded border transition-colors ${isSelected
                              ? "bg-[#00d4ff] border-[#00d4ff]"
                              : "border-slate-600 bg-transparent"
                            }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="text-[11px] truncate">{topic}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
