"use client";

import {
  memo,
  type FormEvent,
  type UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  fetchSessionHistory,
  streamChatResponse,
  type ChatSource,
  type ChatStreamEvent,
} from "@/lib/api";

type ToastVariant = "success" | "error";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  sources?: ChatSource[];
};

type ChatStreamPanelProps = {
  activeSessionId: string;
  onToast: (message: string, variant: ToastVariant) => void;
};

const markdownComponents: Components = {
  h1: (props) => <h1 className="mb-2 text-lg font-semibold" {...props} />,
  h2: (props) => <h2 className="mb-2 text-base font-semibold" {...props} />,
  h3: (props) => <h3 className="mb-1 text-sm font-semibold" {...props} />,
  p: (props) => <p className="mb-2 leading-6" {...props} />,
  ul: (props) => <ul className="mb-2 list-disc pl-5" {...props} />,
  ol: (props) => <ol className="mb-2 list-decimal pl-5" {...props} />,
  li: (props) => <li className="mb-1" {...props} />,
  table: (props) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-[var(--ax-border)] px-2 py-1 text-left" {...props} />,
  td: (props) => <td className="border border-[var(--ax-border)] px-2 py-1" {...props} />,
  pre: (props) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-[var(--ax-surface-subtle)] border border-[var(--ax-border)] p-3 text-xs text-[var(--ax-text)]" {...props} />
  ),
  code: (props) => (
    <code
      className="rounded bg-[var(--ax-surface-raised)] border border-[var(--ax-border)] px-1 py-0.5 font-mono text-[0.78rem] text-[var(--ax-text)]"
      {...props}
    />
  ),
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function sourceSummary(sources: ChatSource[] | undefined): string {
  if (!sources || sources.length === 0) {
    return "no sources";
  }
  const labels = sources.slice(0, 3).map((source) => source.filename);
  const suffix = sources.length > 3 ? ` +${sources.length - 3}` : "";
  return `${labels.join(", ")}${suffix}`;
}

const ChatBubble = memo(function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "assistant" && !message.content.trim() && !message.sources?.length) {
    return null;
  }

  return (
    <div
      className={`fade-in max-w-[88%] rounded-xl border px-4 py-3 shadow-sm ${
        message.role === "assistant"
          ? "border-[var(--ax-border)] bg-[var(--ax-surface)] text-[var(--ax-text)]"
          : "ml-auto border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-accent-fg)]"
      }`}
    >
      <p className="text-[0.68rem] uppercase tracking-[0.12em] opacity-70">{message.role}</p>
      {message.role === "assistant" ? (
        <div className="mt-1 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.68rem] opacity-60">
        <span>{message.createdAt}</span>
        {message.role === "assistant" && (
          <span className="rounded-full border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-2 py-0.5 text-[0.62rem]">
            {sourceSummary(message.sources)}
          </span>
        )}
      </div>
    </div>
  );
});

export function ChatStreamPanel({ activeSessionId, onToast }: ChatStreamPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: createId("msg-assistant"),
      role: "assistant",
      content: `Session \`${activeSessionId.split("-")[0]}\` is active. Ask anything about uploaded documents.`,
      createdAt: "now",
    },
  ]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [streamState, setStreamState] = useState<"idle" | "retrieving" | "generating">("idle");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const tokenBufferRef = useRef("");
  const flushTimerRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior,
    });
  }, []);

  const flushTokenBuffer = useCallback(() => {
    if (!activeAssistantIdRef.current) {
      tokenBufferRef.current = "";
      return;
    }
    const chunk = tokenBufferRef.current;
    if (!chunk) {
      return;
    }
    tokenBufferRef.current = "";

    const targetId = activeAssistantIdRef.current;
    setMessages((current) =>
      current.map((message) =>
        message.id === targetId
          ? {
              ...message,
              content: `${message.content}${chunk}`,
            }
          : message,
      ),
    );
  }, []);

  const scheduleTokenFlush = useCallback(() => {
    if (flushTimerRef.current !== null) {
      return;
    }
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushTokenBuffer();
    }, 42);
  }, [flushTokenBuffer]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoScrollEnabled) {
      scrollToBottom("auto");
    }
  }, [autoScrollEnabled, scrollToBottom, messages.length]);

  // Load History
  useEffect(() => {
    let active = true;

    fetchSessionHistory(activeSessionId)
      .then((res) => {
        if (!active) return;
        const history: ChatMessage[] = res.history.map((h, i) => ({
          id: createId(`history-${i}`),
          role: h.role,
          content: h.content,
          createdAt: new Date(h.created_at).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        if (history.length === 0) {
          setMessages([
            {
              id: createId("msg-assistant"),
              role: "assistant",
              content: `Session \`${activeSessionId.split("-")[0]}\` is active. Ask anything about uploaded documents.`,
              createdAt: "now",
            },
          ]);
          return;
        }

        setMessages(history);
      })
      .catch((err) => {
        if (!active) return;

        const msg = err instanceof Error ? err.message : "";
        const isNotFound = msg.includes("404") || msg.toLowerCase().includes("not found");
        if (isNotFound) {
          setMessages([
            {
              id: createId("msg-assistant"),
              role: "assistant",
              content: `Session \`${activeSessionId.split("-")[0]}\` is active. Ask anything about uploaded documents.`,
              createdAt: "now",
            },
          ]);
          return;
        }

        onToast("Failed to load history.", "error");
      })
      .finally(() => {
        if (active) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeSessionId, onToast]);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setAutoScrollEnabled(distanceFromBottom < 72);
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const message = draft.trim();
      if (!message || isStreaming) {
        return;
      }

      const userMessage: ChatMessage = {
        id: createId("msg-user"),
        role: "user",
        content: message,
        createdAt: "now",
      };
      const assistantId = createId("msg-assistant");
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: "now",
        sources: [],
      };

      setMessages((current) => [...current, userMessage, assistantPlaceholder]);
      setDraft("");
      setIsStreaming(true);
      setShowSkeleton(true);
      setStreamState("retrieving");
      activeAssistantIdRef.current = assistantId;
      tokenBufferRef.current = "";

      let receivedToken = false;

      try {
        await streamChatResponse(
          {
            session_id: activeSessionId,
            message,
          },
          {
            onEvent: (streamEvent: ChatStreamEvent) => {
              if (streamEvent.type === "status") {
                if (streamEvent.value === "retrieving") {
                  setStreamState("retrieving");
                } else {
                  setStreamState("generating");
                }
                return;
              }

              if (streamEvent.type === "sources") {
                const targetId = activeAssistantIdRef.current;
                if (!targetId) {
                  return;
                }
                setMessages((current) =>
                  current.map((entry) =>
                    entry.id === targetId
                      ? {
                          ...entry,
                          sources: streamEvent.sources,
                        }
                      : entry,
                  ),
                );
                return;
              }

              if (streamEvent.type === "token") {
                receivedToken = true;
                setShowSkeleton(false);
                tokenBufferRef.current += streamEvent.token;
                scheduleTokenFlush();
                return;
              }

              if (streamEvent.type === "error") {
                onToast(streamEvent.message, "error");
              }
            },
          },
        );
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "Streaming request failed unexpectedly.";
        onToast(detail, "error");
      } finally {
        if (flushTimerRef.current !== null) {
          window.clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flushTokenBuffer();

        if (!receivedToken && activeAssistantIdRef.current) {
          const targetId = activeAssistantIdRef.current;
          setMessages((current) =>
            current.map((entry) =>
              entry.id === targetId
                ? {
                    ...entry,
                    content:
                      entry.content ||
                      "I couldn't generate a response right now. Please try again in a moment.",
                  }
                : entry,
            ),
          );
        }

        setShowSkeleton(false);
        setIsStreaming(false);
        setStreamState("idle");
        activeAssistantIdRef.current = null;
        tokenBufferRef.current = "";
      }
    },
    [
      activeSessionId,
      draft,
      isStreaming,
      flushTokenBuffer,
      onToast,
      scheduleTokenFlush,
    ],
  );

  let streamStatusLabel = "ready";
  if (streamState === "retrieving") {
    streamStatusLabel = "retrieving context";
  } else if (streamState === "generating") {
    streamStatusLabel = "streaming response";
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-5" ref={scrollRef} onScroll={onScroll}>
        <div className="flex flex-col gap-4">
          {isLoadingHistory ? (
            <div className="flex justify-center py-4">
              <span className="text-xs text-[var(--ax-text-tertiary)]">Loading history...</span>
            </div>
          ) : (
            messages.map((message) => <ChatBubble key={message.id} message={message} />)
          )}
          {showSkeleton && (
            <div className="fade-in max-w-[80%] rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] px-4 py-4">
              <div className="skeleton h-3 w-36 rounded" />
              <div className="mt-2 skeleton h-3 w-64 rounded" />
              <div className="mt-2 skeleton h-3 w-44 rounded" />
            </div>
          )}
        </div>

        {!autoScrollEnabled && (
          <button
            type="button"
            onClick={() => {
              setAutoScrollEnabled(true);
              scrollToBottom("smooth");
            }}
            className="sticky bottom-3 ml-auto block rounded-full border border-[var(--ax-border-strong)] bg-[var(--ax-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ax-text)] shadow-sm transition-all duration-200 hover:bg-[var(--ax-surface-subtle)]"
          >
            Jump to latest
          </button>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-[var(--ax-border)] bg-[var(--ax-surface)]/95 px-5 py-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--ax-text-tertiary)]">
          <span className="uppercase tracking-[0.12em]">chat</span>
          <span>{streamStatusLabel}</span>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isStreaming}
            className="min-w-0 flex-1 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2 text-sm text-[var(--ax-text)] outline-none transition-colors duration-200 placeholder:text-[var(--ax-text-tertiary)] focus:border-[var(--ax-accent)] disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Ask about your indexed documents..."
          />
          <button
            type="submit"
            disabled={isStreaming || !draft.trim()}
            className="rounded-lg bg-[var(--ax-accent)] px-4 py-2 text-sm font-medium text-[var(--ax-accent-fg)] transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
