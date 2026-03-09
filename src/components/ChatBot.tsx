"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hi! I'm MacroTracker AI. Ask me anything about markets, macroeconomics, or navigating this platform. I can point you to specific timelines, association graphs, and more.",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.message || data.error || "Something went wrong." },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I couldn't connect to the server." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Parse markdown links in messages and make them clickable
    const renderContent = (content: string) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts: (string | { text: string; href: string })[] = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index));
            }
            parts.push({ text: match[1], href: match[2] });
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex));
        }

        return parts.map((part, i) => {
            if (typeof part === "string") {
                // Handle bold text
                return (
                    <span key={i}>
                        {part.split(/(\*\*[^*]+\*\*)/).map((segment, j) => {
                            if (segment.startsWith("**") && segment.endsWith("**")) {
                                return (
                                    <strong key={j} className="font-semibold text-white">
                                        {segment.slice(2, -2)}
                                    </strong>
                                );
                            }
                            return segment;
                        })}
                    </span>
                );
            }
            return (
                <button
                    key={i}
                    onClick={() => {
                        router.push(part.href);
                        setIsOpen(false);
                    }}
                    className="text-[#00d4ff] hover:underline font-medium"
                >
                    {part.text}
                </button>
            );
        });
    };

    return (
        <>
            {/* FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0088cc] text-white shadow-lg shadow-[#00d4ff]/20 hover:shadow-[#00d4ff]/40 flex items-center justify-center transition-all duration-200 hover:scale-105"
                aria-label="Open chat"
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
                <div className="fixed bottom-20 right-5 z-50 w-96 max-h-[520px] flex flex-col bg-[#0b0e14] border border-[#1e2530] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-[slideUp_0.2s_ease-out]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2530] bg-[#080b12]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-bold text-white">MacroTracker AI</span>
                        </div>
                        <button
                            onClick={() => setMessages([messages[0]])}
                            className="text-[10px] text-slate-500 hover:text-white transition-colors px-2 py-0.5 rounded border border-slate-800 hover:border-slate-600"
                        >
                            Clear
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[380px]">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${msg.role === "user"
                                            ? "bg-[#00d4ff]/15 text-white rounded-br-sm"
                                            : "bg-slate-800/60 text-slate-300 rounded-bl-sm"
                                        }`}
                                >
                                    {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800/60 px-3 py-2 rounded-xl rounded-bl-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-[#1e2530] p-3 bg-[#080b12]">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Ask about markets, navigate..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00d4ff]/40 focus:ring-1 focus:ring-[#00d4ff]/20 transition-colors"
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="w-8 h-8 rounded-lg bg-[#00d4ff]/20 text-[#00d4ff] flex items-center justify-center hover:bg-[#00d4ff]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
