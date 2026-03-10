"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/** Custom event name used to trigger history restore from NavHeader */
export const CHAT_HISTORY_RESTORE_EVENT = "macrotracker:chat-restore";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ArticlePreview {
    id: string;
    headline: string;
    summary: string | null;
    published_at: string;
    sentiment: string | null;
    source: string | null;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hi! I'm **MacroTracker AI**. Ask me anything about markets, macroeconomics, or navigating this platform.\n\nI can help you:\n- Analyse recent macro events\n- Navigate to Timelines and Association graphs\n- Summarise relevant articles",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [panelSize, setPanelSize] = useState({ width: 480, height: 620 });
    const [hoveredArticle, setHoveredArticle] = useState<{ data: ArticlePreview; rect: DOMRect } | null>(null);
    // Tracks the Supabase session id for the current conversation (null = not yet saved)
    const [sessionId, setSessionId] = useState<string | null>(null);
    const articleCache = useRef<Map<string, ArticlePreview>>(new Map());
    const hoverHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isResizing = useRef(false);
    const resizeStart = useRef({ x: 0, y: 0, w: 480, h: 620 });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    // Derive a conversation title from the first user message
    function deriveTitle(msgs: Message[]): string {
        const first = msgs.find((m) => m.role === "user");
        if (!first) return "New conversation";
        return first.content.trim().slice(0, 80) || "New conversation";
    }

    // Debounced auto-save: called after every assistant reply
    const saveSession = useCallback(async (msgs: Message[], sid: string | null) => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch("/api/chat/history", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: sid ?? undefined,
                        title: deriveTitle(msgs),
                        messages: msgs,
                    }),
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.session?.id) setSessionId(json.session.id);
                }
            } catch { /* silent — not critical */ }
        }, 800);
    }, []);

    // Listen for restore events dispatched from NavHeader
    useEffect(() => {
        async function onRestore(e: Event) {
            const id = (e as CustomEvent<string>).detail;
            try {
                const res = await fetch(`/api/chat/history/${id}`);
                if (!res.ok) return;
                const json = await res.json();
                const restored: Message[] = Array.isArray(json.session?.messages) ? json.session.messages : [];
                if (restored.length === 0) return;
                setMessages(restored);
                setSessionId(id);
                setIsOpen(true);
            } catch { /* silent */ }
        }
        window.addEventListener(CHAT_HISTORY_RESTORE_EVENT, onRestore);
        return () => window.removeEventListener(CHAT_HISTORY_RESTORE_EVENT, onRestore);
    }, []);

    const handleArticleLinkEnter = useCallback(async (id: string, rect: DOMRect) => {
        if (hoverHideTimeout.current) clearTimeout(hoverHideTimeout.current);
        if (articleCache.current.has(id)) {
            setHoveredArticle({ data: articleCache.current.get(id)!, rect });
            return;
        }
        try {
            const res = await fetch(`/api/articles/${id}`);
            if (res.ok) {
                const json = await res.json();
                const article: ArticlePreview = json.article;
                articleCache.current.set(id, article);
                setHoveredArticle({ data: article, rect });
            }
        } catch { /* ignore */ }
    }, []);

    const handleArticleLinkLeave = useCallback(() => {
        hoverHideTimeout.current = setTimeout(() => setHoveredArticle(null), 180);
    }, []);

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        resizeStart.current = { x: e.clientX, y: e.clientY, w: panelSize.width, h: panelSize.height };

        const onMouseMove = (ev: MouseEvent) => {
            if (!isResizing.current) return;
            // Dragging left/up expands the panel (anchored bottom-right)
            const dw = resizeStart.current.x - ev.clientX;
            const dh = resizeStart.current.y - ev.clientY;
            setPanelSize({
                width: Math.min(800, Math.max(320, resizeStart.current.w + dw)),
                height: Math.min(window.innerHeight - 120, Math.max(400, resizeStart.current.h + dh)),
            });
        };

        const onMouseUp = () => {
            isResizing.current = false;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }, [panelSize]);


    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        const supabase = createSupabaseBrowserClient();
        supabase.auth.getUser().then(({ data }) => setAuthenticated(!!data.user));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuthenticated(!!session?.user);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMessage: Message = { role: "user", content: text };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });
            const data = await res.json();
            const assistantMessage: Message = { role: "assistant", content: data.message || data.error || "Something went wrong." };
            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);
            // Auto-save after every assistant reply
            await saveSession(finalMessages, sessionId);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I couldn't connect to the server." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Markdown component overrides — memoized so identity is stable across re-renders,
    // preventing ReactMarkdown from remounting link buttons and re-firing onMouseEnter.
    const markdownComponents: Components = useMemo(() => ({  // eslint-disable-line react-hooks/exhaustive-deps
        h1: ({ children }) => (
            <h1 className="text-base font-bold text-white mt-3 mb-1 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-sm font-bold text-white mt-3 mb-1 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-[#00d4ff] mt-2 mb-1 first:mt-0">{children}</h3>
        ),
        p: ({ children }) => (
            <p className="text-[13px] text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
            <ul className="list-disc list-outside space-y-1 mb-2 text-[13px] text-slate-300 pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
            <ol className="list-decimal list-outside space-y-1 mb-2 text-[13px] text-slate-300 pl-5">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
        strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
            <em className="italic text-slate-400">{children}</em>
        ),
        code: ({ children, className }) => {
            // Block code (has a language class)
            if (className) {
                return (
                    <code className="block bg-slate-900 text-emerald-400 text-[12px] font-mono px-3 py-2 rounded-lg my-1 overflow-x-auto">
                        {children}
                    </code>
                );
            }
            return (
                <code className="bg-slate-900 text-emerald-400 text-[12px] font-mono px-1.5 py-0.5 rounded">
                    {children}
                </code>
            );
        },
        pre: ({ children }) => (
            <pre className="bg-slate-900 rounded-lg my-2 overflow-x-auto">{children}</pre>
        ),
        blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#00d4ff]/50 pl-3 my-2 text-slate-400 italic text-[13px]">
                {children}
            </blockquote>
        ),
        hr: () => <hr className="border-slate-700 my-2" />,
        a: ({ href, children }) => {
            const isInternal = href?.startsWith("/");
            const articleMatch = href?.match(/^\/article\/([\w-]+)$/);
            if (isInternal) {
                return (
                    <button
                        onClick={() => {
                            router.push(href!);
                            setIsOpen(false);
                        }}
                        onMouseEnter={articleMatch ? (e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            handleArticleLinkEnter(articleMatch[1], rect);
                        } : undefined}
                        onMouseLeave={articleMatch ? handleArticleLinkLeave : undefined}
                        className="text-[#00d4ff] hover:text-[#33ddff] underline underline-offset-2 font-medium transition-colors cursor-pointer"
                    >
                        {children}
                    </button>
                );
            }
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00d4ff] hover:text-[#33ddff] underline underline-offset-2 font-medium transition-colors cursor-pointer"
                >
                    {children}
                </a>
            );
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [router, handleArticleLinkEnter, handleArticleLinkLeave]);

    const INITIAL_MESSAGE = messages[0];

    function handleClearChat() {
        setMessages([INITIAL_MESSAGE]);
        setSessionId(null);
    }

    // Position the hover card above (or below if too close to top) the hovered link
    const hoverCardStyle = (() => {
        if (!hoveredArticle) return {};
        const { rect } = hoveredArticle;
        const cardHeight = 140;
        const cardWidth = Math.min(panelSize.width - 24, 380);
        const spaceAbove = rect.top;
        const top = spaceAbove > cardHeight + 8 ? rect.top - cardHeight - 8 : rect.bottom + 8;
        // Align horizontally to the link, clamped to viewport
        const left = Math.min(Math.max(rect.left, 8), window.innerWidth - cardWidth - 8);
        return { top, left, width: cardWidth };
    })();

    if (!authenticated) return null;

    return (
        <>
            {/* Article hover preview card */}
            {hoveredArticle && (
                <div
                    className="fixed z-[60] pointer-events-auto"
                    style={hoverCardStyle}
                    onMouseEnter={() => {
                        if (hoverHideTimeout.current) clearTimeout(hoverHideTimeout.current);
                    }}
                    onMouseLeave={() => {
                        hoverHideTimeout.current = setTimeout(() => setHoveredArticle(null), 180);
                    }}
                >
                    <div className="bg-[#0d1117] border border-[#1e2530] rounded-xl shadow-2xl shadow-black/60 p-3 animate-[slideUp_0.15s_ease-out]">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-[12px] font-semibold text-white leading-snug line-clamp-2">
                                {hoveredArticle.data.headline}
                            </p>
                            {hoveredArticle.data.sentiment && (
                                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                                    hoveredArticle.data.sentiment === "Bullish"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : hoveredArticle.data.sentiment === "Bearish"
                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                }`}>
                                    {hoveredArticle.data.sentiment}
                                </span>
                            )}
                        </div>
                        {hoveredArticle.data.summary && (
                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-2">
                                {hoveredArticle.data.summary}
                            </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            {hoveredArticle.data.source && (
                                <span className="font-medium text-slate-400">{hoveredArticle.data.source}</span>
                            )}
                            {hoveredArticle.data.source && <span>·</span>}
                            <span>{new Date(hoveredArticle.data.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-5 right-5 z-50 w-13 h-13 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0077bb] text-white shadow-xl shadow-[#00d4ff]/25 hover:shadow-[#00d4ff]/50 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Open MacroTracker AI chat"
                style={{ width: "52px", height: "52px" }}
            >
                {isOpen ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-20 right-5 z-50 flex flex-col bg-[#0a0d14] border border-[#1e2530] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-[slideUp_0.2s_ease-out]"
                    style={{ width: `${panelSize.width}px`, height: `${panelSize.height}px` }}
                >
                    {/* Resize handle — top-left corner */}
                    <div
                        onMouseDown={onResizeMouseDown}
                        className="absolute top-0 left-0 w-7 h-7 z-10 cursor-nw-resize flex items-center justify-center rounded-br-xl group hover:bg-[#00d4ff]/10 transition-colors"
                        title="Drag to resize"
                    >
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-[#00d4ff] transition-colors" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            {/* Two diagonal double-headed arrows — standard resize affordance */}
                            <line x1="2" y1="8" x2="8" y2="2" />
                            <polyline points="2,5 2,8 5,8" />
                            <polyline points="8,2 11,2 11,5" />
                            <line x1="6" y1="14" x2="14" y2="6" />
                            <polyline points="6,14 9,14 9,11" />
                            <polyline points="14,6 14,9 11,9" />
                        </svg>
                    </div>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2530] bg-[#07090f] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff]/20 to-[#0088cc]/20 border border-[#00d4ff]/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.414 2.798H4.212c-1.444 0-2.414-1.798-1.414-2.798L4.2 15.3" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white">MacroTracker AI</span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-none mt-0.5">Macro intelligence assistant</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClearChat}
                            className="text-[10px] text-slate-500 hover:text-white transition-colors px-2.5 py-1 rounded-md border border-slate-800 hover:border-slate-600 hover:bg-slate-800/40"
                        >
                            Clear chat
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4ff]/15 to-[#0088cc]/15 border border-[#00d4ff]/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <svg className="w-3.5 h-3.5 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.414 2.798H4.212c-1.444 0-2.414-1.798-1.414-2.798L4.2 15.3" />
                                        </svg>
                                    </div>
                                )}
                                <div
                                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-[13px] ${
                                        msg.role === "user"
                                            ? "bg-[#00d4ff]/12 border border-[#00d4ff]/20 text-white rounded-tr-sm"
                                            : "bg-[#111520] border border-[#1e2530] text-slate-300 rounded-tl-sm"
                                    }`}
                                >
                                    {msg.role === "assistant" ? (
                                        <div className="prose-chat">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={markdownComponents}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <span className="leading-relaxed whitespace-pre-wrap">{msg.content}</span>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <div className="w-7 h-7 rounded-lg bg-slate-700/50 border border-slate-600/30 flex items-center justify-center shrink-0 mt-0.5">
                                        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-2.5 justify-start">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4ff]/15 to-[#0088cc]/15 border border-[#00d4ff]/20 flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.414 2.798H4.212c-1.444 0-2.414-1.798-1.414-2.798L4.2 15.3" />
                                    </svg>
                                </div>
                                <div className="bg-[#111520] border border-[#1e2530] px-4 py-3 rounded-2xl rounded-tl-sm">
                                    <div className="flex gap-1.5 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-[#1e2530] p-4 bg-[#07090f] shrink-0">
                        <div className="flex gap-3 items-end">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                placeholder="Ask about markets, rates, geopolitics…"
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    // Auto-resize up to 4 rows
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                                }}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-[#111520] border border-[#1e2530] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00d4ff]/40 focus:ring-1 focus:ring-[#00d4ff]/15 transition-colors resize-none overflow-hidden leading-relaxed"
                                style={{ minHeight: "40px" }}
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#0088cc]/20 border border-[#00d4ff]/25 text-[#00d4ff] flex items-center justify-center hover:from-[#00d4ff]/35 hover:to-[#0088cc]/35 hover:border-[#00d4ff]/50 transition-all disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2">Enter to send · Shift+Enter for new line</p>
                    </div>
                </div>
            )}
        </>
    );
}
