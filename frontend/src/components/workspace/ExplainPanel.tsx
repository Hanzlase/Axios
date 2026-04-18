"use client";

import { memo, useCallback, useEffect, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  streamAgentResponse,
  type AgentStreamEvent,
  type ChatSource,
  type ExplainLevel,
} from "@/lib/api";

import { fetchSessionResults } from "@/lib/api";

import { loadSessionUiState, patchSessionUiState } from "@/lib/session";

type ExplainPanelProps = {
  activeSessionId: string;
  onToast: (message: string, variant: "success" | "error") => void;
};

const mdComponents: Components = {
  h1: (p) => <h1 className="mb-2 text-base font-semibold" {...p} />,
  h2: (p) => <h2 className="mb-1 text-sm font-semibold" {...p} />,
  h3: (p) => <h3 className="mb-1 text-sm font-medium" {...p} />,
  p: (p) => <p className="mb-2 leading-6" {...p} />,
  ul: (p) => <ul className="mb-2 list-disc pl-5" {...p} />,
  ol: (p) => <ol className="mb-2 list-decimal pl-5" {...p} />,
  li: (p) => <li className="mb-1" {...p} />,
  pre: (p) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-[var(--ax-surface-subtle)] border border-[var(--ax-border)] p-3 text-xs text-[var(--ax-text)]" {...p} />
  ),
  code: (p) => (
    <code className="rounded bg-[var(--ax-surface-raised)] border border-[var(--ax-border)] px-1 py-0.5 font-mono text-[0.78rem] text-[var(--ax-text)]" {...p} />
  ),
};

const LEVELS: { value: ExplainLevel; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const ExplainPanel = memo(function ExplainPanel({
  activeSessionId,
  onToast,
}: ExplainPanelProps) {
  const restored = loadSessionUiState(activeSessionId);

  const initialLevel =
    (restored.explain?.level as ExplainLevel | undefined) ?? "intermediate";

  const [level, setLevel] = useState<ExplainLevel>(initialLevel);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const levelState = (restored.explain?.byLevel ?? {}) as Record<ExplainLevel, { content?: string; sources?: ChatSource[] }>;
  const [content, setContent] = useState(levelState[initialLevel]?.content ?? "");
  const [sources, setSources] = useState<ChatSource[]>(levelState[initialLevel]?.sources ?? []);

  const [status, setStatus] = useState<"idle" | "retrieving" | "generating">("idle");

  const persistLevelSnapshot = useCallback(
    (lvl: ExplainLevel, next: { content?: string; sources?: ChatSource[] }) => {
      const current = loadSessionUiState(activeSessionId).explain ?? {};
      const byLevel = (current.byLevel ?? {}) as Record<ExplainLevel, { content?: string; sources?: ChatSource[] }>;
      patchSessionUiState(activeSessionId, {
        explain: {
          ...current,
          level: lvl,
          byLevel: {
            ...byLevel,
            [lvl]: {
              ...byLevel[lvl],
              ...next,
            },
          },
        },
      });
    },
    [activeSessionId],
  );

  // Rehydrate on session change
  useEffect(() => {
    const ui = loadSessionUiState(activeSessionId);
    const preferred = (ui.explain?.level as ExplainLevel | undefined) ?? "intermediate";
    const byLevel = (ui.explain?.byLevel ?? {}) as Record<ExplainLevel, { content?: string; sources?: ChatSource[] }>;

    const timer = window.setTimeout(() => {
      setLevel(preferred);
      setContent(byLevel[preferred]?.content ?? "");
      setSources(byLevel[preferred]?.sources ?? []);
      setStatus("idle");
      setIsStreaming(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeSessionId]);

  // When user changes level, swap displayed content to that level's stored output.
  useEffect(() => {
    const ui = loadSessionUiState(activeSessionId);
    const byLevel = (ui.explain?.byLevel ?? {}) as Record<ExplainLevel, { content?: string; sources?: ChatSource[] }>;
    setContent(byLevel[level]?.content ?? "");
    setSources(byLevel[level]?.sources ?? []);

    // If we don't have it locally, try server fallback.
    if (!byLevel[level]?.content) {
      fetchSessionResults(activeSessionId)
        .then((r) => {
          const explain = r.results.explain as unknown;
          // Support either shape: { content, sources, level } OR { byLevel: { simple/intermediate/advanced } }
          const byLvl =
            (explain as { byLevel?: Record<string, unknown> } | undefined)?.byLevel;
          const serverForLevel = byLvl?.[level] as
            | { content?: string; sources?: ChatSource[] }
            | undefined;

          const flat = explain as { content?: string; sources?: ChatSource[]; level?: ExplainLevel } | undefined;
          const resolved =
            serverForLevel ??
            (flat?.level === level ? { content: flat.content, sources: flat.sources } : undefined);

          if (resolved?.content) {
            setContent(resolved.content);
            setSources(resolved.sources ?? []);
            persistLevelSnapshot(level, {
              content: resolved.content,
              sources: resolved.sources ?? [],
            });
          }
        })
        .catch(() => {
          // backend offline
        });
    }
  }, [activeSessionId, level, persistLevelSnapshot]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const msg = draft.trim();
      if (!msg || isStreaming) return;
      setDraft("");
      setIsStreaming(true);
      setContent("");
      setSources([]);
      setStatus("retrieving");

      // Clear persisted content for THIS level only
      persistLevelSnapshot(level, { content: "", sources: [] });

      try {
        await streamAgentResponse(
          { session_id: activeSessionId, message: msg, mode: "explain", level },
          {
            onEvent: (ev: AgentStreamEvent) => {
              if (ev.type === "status") {
                setStatus(ev.value === "retrieving" ? "retrieving" : "generating");
              } else if (ev.type === "sources") {
                setSources(ev.sources);
                persistLevelSnapshot(level, { sources: ev.sources });
              } else if (ev.type === "token") {
                setContent((c) => {
                  const next = c + ev.token;
                  persistLevelSnapshot(level, { content: next });
                  return next;
                });
              } else if (ev.type === "error") {
                onToast(ev.message, "error");
              }
            },
          },
        );
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Request failed.", "error");
      } finally {
        setIsStreaming(false);
        setStatus("idle");
      }
    },
    [activeSessionId, draft, isStreaming, level, onToast, persistLevelSnapshot],
  );

  const statusLabel =
    status === "retrieving"
      ? "Retrieving context…"
      : status === "generating"
        ? "Generating explanation…"
        : "Ready";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Level selector */}
      <div className="border-b border-[var(--ax-border)] px-5 py-3 flex items-center gap-2">
        <span className="text-xs text-[var(--ax-text-tertiary)] uppercase tracking-wider mr-2">Level</span>
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLevel(l.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
              level === l.value
                ? "border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-accent-fg)]"
                : "border-[var(--ax-border)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)]"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {!content && !isStreaming && (
          <p className="text-sm text-[var(--ax-text-tertiary)] italic">
            Type a concept or topic below to get an explanation grounded in your documents.
          </p>
        )}
        {isStreaming && !content && (
          <div className="space-y-2 fade-in">
            <div className="skeleton h-3 w-48 rounded" />
            <div className="skeleton h-3 w-72 rounded" />
            <div className="skeleton h-3 w-56 rounded" />
          </div>
        )}
        {content && (
          <div className="fade-in rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] px-5 py-4 text-sm text-[var(--ax-text)] shadow-[var(--ax-shadow)]">
            <p className="text-[0.65rem] uppercase tracking-widest text-[var(--ax-text-tertiary)] mb-3">
              Explanation · {level}
            </p>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {content}
            </ReactMarkdown>
            {sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1 border-t border-[var(--ax-border)] pt-3">
                {sources.map((s) => (
                  <span
                    key={s.chunk_id}
                    className="rounded-full border border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)] px-2 py-0.5 text-[0.62rem] text-[var(--ax-text-secondary)]"
                  >
                    {s.filename}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-[var(--ax-border)] bg-[var(--ax-surface)]/95 px-5 py-4 backdrop-blur-sm">
        <div className="mb-2 flex justify-between text-xs text-[var(--ax-text-tertiary)]">
          <span className="uppercase tracking-wider">explain</span>
          <span>{statusLabel}</span>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isStreaming}
            placeholder="What would you like explained?"
            className="min-w-0 flex-1 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2 text-sm text-[var(--ax-text)] outline-none transition-colors placeholder:text-[var(--ax-text-tertiary)] focus:border-[var(--ax-accent)] disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={isStreaming || !draft.trim()}
            className="rounded-lg bg-[var(--ax-accent)] px-4 py-2 text-sm font-medium text-[var(--ax-accent-fg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Explain
          </button>
        </form>
      </div>
    </div>
  );
});
