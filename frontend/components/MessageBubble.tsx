"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, User, Bot } from "lucide-react";
import { Message } from "@/types";
import SourceCitation from "./SourceCitation";
import DisclaimerBanner from "./DisclaimerBanner";
import { cn } from "@/lib/utils";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";
  const resp = message.response;

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={cn("max-w-[80%] space-y-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-blue-600 text-white rounded-tr-sm"
              : "bg-white/8 text-white/90 rounded-tl-sm border border-white/10"
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          )}
        </div>

        {resp && !isUser && resp.sources.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              {showSources ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {resp.sources.length} source{resp.sources.length > 1 ? "s" : ""}
            </button>
            {showSources && (
              <div className="space-y-2">
                {resp.sources.map((s, i) => (
                  <SourceCitation key={s.chunk_id} source={s} index={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {resp && !isUser && resp.disclaimer && (
          <DisclaimerBanner text={resp.disclaimer} />
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
          <User className="h-4 w-4 text-white/70" />
        </div>
      )}
    </div>
  );
}
