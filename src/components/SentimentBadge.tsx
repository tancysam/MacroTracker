import type { Sentiment } from "@/lib/types";

const BADGE_STYLES: Record<Sentiment, string> = {
  Bullish: "bg-[#00f5d4]/10 border-[#00f5d4]/20 text-[#00f5d4]",
  Bearish: "bg-[#ff4d6d]/10 border-[#ff4d6d]/20 text-[#ff4d6d]",
  Neutral: "bg-[#fb8500]/10 border-[#fb8500]/20 text-[#fb8500]",
};

export default function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span
      className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${BADGE_STYLES[sentiment]}`}
    >
      {sentiment}
    </span>
  );
}
