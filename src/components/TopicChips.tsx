"use client";

import { TOPIC_CHIPS } from "@/lib/constants";

interface TopicChipsProps {
  selected: string;
  onSelect: (topic: string) => void;
}

export default function TopicChips({ selected, onSelect }: TopicChipsProps) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
        Focus Topics
      </h3>
      <div className="flex flex-wrap gap-2">
        {TOPIC_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onSelect(chip)}
            className={
              selected === chip
                ? "px-3 py-1.5 rounded-full bg-[#00d4ff] text-white text-xs font-semibold"
                : "px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 text-xs font-medium hover:bg-[#00d4ff]/20 transition-colors"
            }
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
