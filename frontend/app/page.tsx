"use client";
import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatSession, DocFilter, Message, SourceChunk } from "@/types";
import { queryDocuments } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import RightPanel from "@/components/RightPanel";
import UploadModal from "@/components/UploadModal";
import WelcomeTour from "@/components/WelcomeTour";

const SESSIONS_KEY = "rag_sessions";
const ACTIVE_KEY = "rag_active_session_id";
const TOUR_KEY = "rag_tour_seen";

type SerMsg = Omit<Message, "timestamp"> & { timestamp: string };
type SerSession = Omit<ChatSession, "messages"> & { messages: SerMsg[] };

function serializeSessions(sessions: ChatSession[]): string {
  return JSON.stringify(
    sessions.map((s) => ({
      ...s,
      messages: s.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      })),
    }))
  );
}

function deserializeSessions(raw: string): ChatSession[] {
  try {
    return (JSON.parse(raw) as SerSession[]).map((s) => ({
      ...s,
      messages: s.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

function makeNewSession(): ChatSession {
  return {
    id: uuidv4(),
    title: "New conversation",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  // Hydrate sessions from localStorage after first render (avoids SSR mismatch)
  useEffect(() => {
    let loaded: ChatSession[] = [];
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (raw) loaded = deserializeSessions(raw);
    } catch {}
    if (loaded.length === 0) loaded = [makeNewSession()];
    setSessions(loaded);
    try {
      const saved = localStorage.getItem(ACTIVE_KEY);
      setActiveSessionId(saved && loaded.find((s) => s.id === saved) ? saved : loaded[0].id);
    } catch {
      setActiveSessionId(loaded[0].id);
    }
    if (!localStorage.getItem(TOUR_KEY)) setShowTour(true);
  }, []);

  const [loading, setLoading] = useState(false);
  const [docFilter, setDocFilter] = useState<DocFilter>({});
  const [showUpload, setShowUpload] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [citSources, setCitSources] = useState<SourceChunk[] | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [activeSourceIdx, setActiveSourceIdx] = useState<number | null>(null);

  // Persist sessions
  const persistSessions = useCallback((next: ChatSession[]) => {
    try {
      localStorage.setItem(SESSIONS_KEY, serializeSessions(next));
    } catch {}
  }, []);

  // Persist active session id
  const persistActive = useCallback((id: string) => {
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {}
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  function createNewSession() {
    const s = makeNewSession();
    const next = [s, ...sessions];
    setSessions(next);
    persistSessions(next);
    setActiveSessionId(s.id);
    persistActive(s.id);
    setCitSources(null);
    setActiveMsgId(null);
    setActiveSourceIdx(null);
  }

  function switchSession(id: string) {
    setActiveSessionId(id);
    persistActive(id);
    setCitSources(null);
    setActiveMsgId(null);
    setActiveSourceIdx(null);
  }

  function deleteSession(id: string) {
    const filtered = sessions.filter((s) => s.id !== id);
    const next = filtered.length > 0 ? filtered : [makeNewSession()];
    setSessions(next);
    persistSessions(next);
    if (id === activeSessionId) {
      setActiveSessionId(next[0].id);
      persistActive(next[0].id);
      setCitSources(null);
      setActiveMsgId(null);
      setActiveSourceIdx(null);
    }
  }

  function handleSelectSources(msg: Message) {
    if (activeMsgId === msg.id) {
      setCitSources(null);
      setActiveMsgId(null);
      setActiveSourceIdx(null);
    } else {
      setCitSources(msg.response?.sources ?? null);
      setActiveMsgId(msg.id);
      setActiveSourceIdx(null);
    }
  }

  async function handleSend(question: string, model?: string) {
    if (!question.trim() || loading) return;
    const sid = activeSessionId;
    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sid) return s;
        return {
          ...s,
          title: s.messages.length === 0 ? question.slice(0, 55) : s.title,
          messages: [...s.messages, userMsg],
          updatedAt: new Date().toISOString(),
        };
      });
      persistSessions(next);
      return next;
    });
    setLoading(true);

    try {
      const filter = Object.keys(docFilter).length ? docFilter : undefined;
      const resp = await queryDocuments(question, filter, 5, model);
      const aMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: resp.answer,
        response: resp,
        timestamp: new Date(),
      };
      setSessions((prev) => {
        const next = prev.map((s) => {
          if (s.id !== sid) return s;
          return {
            ...s,
            messages: [...s.messages, aMsg],
            updatedAt: new Date().toISOString(),
          };
        });
        persistSessions(next);
        return next;
      });
      if (resp.sources.length > 0) {
        setCitSources(resp.sources);
        setActiveMsgId(aMsg.id);
        setActiveSourceIdx(null);
      }
    } catch (err) {
      const eMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setSessions((prev) => {
        const next = prev.map((s) => {
          if (s.id !== sid) return s;
          return {
            ...s,
            messages: [...s.messages, eMsg],
            updatedAt: new Date().toISOString(),
          };
        });
        persistSessions(next);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex overflow-hidden"
      style={{ height: "100vh", background: "var(--color-canvas)" }}
    >
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={switchSession}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
        onFilterChange={setDocFilter}
        onUpload={() => setShowUpload(true)}
      />

      <ChatPanel
        messages={messages}
        loading={loading}
        activeMsgId={activeMsgId}
        sessionTitle={activeSession?.title ?? "New conversation"}
        onSend={handleSend}
        onNewChat={createNewSession}
        onSelectSources={handleSelectSources}
      />

      {citSources && citSources.length > 0 && (
        <div style={{ animation: "fadeIn 0.2s ease" }}>
          <RightPanel
            sources={citSources}
            activeIdx={activeSourceIdx}
            onSetActiveIdx={setActiveSourceIdx}
            onClose={() => {
              setCitSources(null);
              setActiveMsgId(null);
              setActiveSourceIdx(null);
            }}
          />
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => setShowUpload(false)}
        />
      )}

      {showTour && (
        <WelcomeTour
          onClose={() => {
            setShowTour(false);
            try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
          }}
        />
      )}
    </main>
  );
}
