"use client";

import { useEffect, useState, useCallback } from "react";

interface SessionMeta {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatHistoryPanelProps {
  onClose: () => void;
  onRestore: (sessionId: string) => void;
}

export default function ChatHistoryPanel({ onClose, onRestore }: ChatHistoryPanelProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/history");
      if (res.ok) {
        const json = await res.json();
        setSessions(json.sessions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(id);
    try {
      await fetch(`/api/chat/history/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-80 bg-[#080b12] border-l border-[#1e2530] shadow-2xl shadow-black/60 flex flex-col animate-[slideInRight_0.2s_ease-out]"
        role="dialog"
        aria-label="Chat history"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2530] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#00d4ff] text-xl">history</span>
            <h2 className="text-sm font-bold text-white">Chat History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <span className="material-symbols-outlined text-slate-600 text-4xl">chat_bubble</span>
              <p className="text-slate-500 text-sm">No saved conversations yet.</p>
              <p className="text-slate-600 text-xs">Your chats will appear here after you send a message.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#1a2030]">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      onRestore(s.id);
                      onClose();
                    }}
                    className="w-full flex items-start justify-between gap-2 px-5 py-3.5 text-left hover:bg-[#0d1117] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white leading-snug truncate group-hover:text-[#00d4ff] transition-colors">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(s.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(s.id, e)}
                      disabled={deleting === s.id}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1 rounded"
                      aria-label="Delete session"
                      title="Delete"
                    >
                      {deleting === s.id ? (
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-base">delete</span>
                      )}
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
