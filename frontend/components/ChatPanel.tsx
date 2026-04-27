"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Message, DocFilter } from "@/types";
import { queryDocuments } from "@/lib/api";
import MessageBubble from "./MessageBubble";

interface Props {
  docFilter?: DocFilter;
}

export default function ChatPanel({ docFilter }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");

    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await queryDocuments(question, docFilter);
      const assistantMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: resp.answer,
        response: resp,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/40 text-sm">
            <p className="text-3xl">⚕️ ⚖️</p>
            <p>Ask a question about your uploaded documents.</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Retrieving relevant passages…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your documents… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
