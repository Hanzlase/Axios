"use client";

import { memo, useCallback, useEffect, useState } from "react";

import {
  streamAgentResponse,
  fetchSessionResults,
  type AgentStreamEvent,
  type Flashcard,
} from "@/lib/api";

import { loadSessionUiState, patchSessionUiState } from "@/lib/session";

type FlashcardPanelProps = {
  activeSessionId: string;
  onToast: (message: string, variant: "success" | "error") => void;
};

const FlashcardView = memo(function FlashcardView({
  card,
  index,
  total,
}: {
  card: Flashcard;
  index: number;
  total: number;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-[var(--ax-text-tertiary)] uppercase tracking-wider">
        Card {index + 1} of {total}
      </p>
      {/* 3-D flip container */}
      <div
        className="flashcard-scene w-full cursor-pointer"
        style={{ height: "220px" }}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Show front" : "Show answer"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
        }}
      >
        <div className={`flashcard-card ${flipped ? "flipped" : ""}`}>
          {/* Front */}
          <div className="flashcard-face rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-surface)] shadow-[var(--ax-shadow)] flex flex-col items-center justify-center px-8 py-6">
            <p className="text-[0.65rem] uppercase tracking-widest text-[var(--ax-text-tertiary)] mb-3">
              Question
            </p>
            <p className="text-center text-base font-medium text-[var(--ax-text)] leading-7">
              {card.front}
            </p>
            <p className="mt-5 text-xs text-[var(--ax-text-secondary)]">
              Click to reveal answer
            </p>
          </div>
          {/* Back */}
          <div className="flashcard-face flashcard-face-back rounded-2xl border border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)] shadow-[var(--ax-shadow)] flex flex-col items-center justify-center px-8 py-6">
            <p className="text-[0.65rem] uppercase tracking-widest text-[var(--ax-text-tertiary)] mb-3">
              Answer
            </p>
            <p className="text-center text-sm text-[var(--ax-text)] leading-7">
              {card.back}
            </p>
            <p className="mt-5 text-xs text-[var(--ax-text-secondary)]">
              Click to flip back
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export const FlashcardPanel = memo(function FlashcardPanel({
  activeSessionId,
  onToast,
}: FlashcardPanelProps) {
  const restored = loadSessionUiState(activeSessionId);

  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>(
    (restored.flashcards?.cards as Flashcard[] | undefined) ?? [],
  );
  const [currentIndex, setCurrentIndex] = useState(
    restored.flashcards?.currentIndex ?? 0,
  );
  const [numCards, setNumCards] = useState(restored.flashcards?.numCards ?? 10);

  useEffect(() => {
    const ui = loadSessionUiState(activeSessionId);
    const timer = window.setTimeout(() => {
      setCards((ui.flashcards?.cards as Flashcard[] | undefined) ?? []);
      setCurrentIndex(ui.flashcards?.currentIndex ?? 0);
      setNumCards(ui.flashcards?.numCards ?? 10);
    }, 0);

    // server fallback
    fetchSessionResults(activeSessionId)
      .then((r) => {
        if (r.results.flashcards?.cards?.length) {
          setCards(r.results.flashcards.cards);
          patchSessionUiState(activeSessionId, {
            flashcards: {
              ...(loadSessionUiState(activeSessionId).flashcards ?? {}),
              cards: r.results.flashcards.cards,
            },
          });
        }
      })
      .catch(() => {});

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeSessionId]);

  useEffect(() => {
    patchSessionUiState(activeSessionId, {
      flashcards: {
        ...(loadSessionUiState(activeSessionId).flashcards ?? {}),
        numCards,
      },
    });
  }, [activeSessionId, numCards]);

  const persistFlashSnapshot = useCallback(
    (next: { cards?: Flashcard[]; currentIndex?: number }) => {
      const current = loadSessionUiState(activeSessionId).flashcards ?? {};
      patchSessionUiState(activeSessionId, {
        flashcards: {
          ...current,
          ...next,
        },
      });
    },
    [activeSessionId],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const msg = draft.trim();
      if (!msg || isLoading) return;
      setDraft("");
      setIsLoading(true);
      setCards([]);
      setCurrentIndex(0);
      persistFlashSnapshot({ cards: [], currentIndex: 0 });

      const BATCH_SIZE = 12;
      const totalRequested = Math.max(1, Math.min(numCards, 100));
      const numBatches = Math.ceil(totalRequested / BATCH_SIZE);
      const accumulated: Flashcard[] = [];

      try {
        for (let i = 0; i < numBatches; i++) {
          const countForBatch = Math.min(BATCH_SIZE, totalRequested - i * BATCH_SIZE);
          const batchMsg = i === 0 ? msg : `Generate ${countForBatch} more flashcards for: ${msg}. Avoid repeats.`;

          await streamAgentResponse(
            { session_id: activeSessionId, message: batchMsg, mode: "flashcards", num_cards: countForBatch },
            {
              onEvent: (ev: AgentStreamEvent) => {
                if (ev.type === "result" && ev.mode === "flashcards") {
                  accumulated.push(...ev.data.cards);
                  setCards([...accumulated]);
                  persistFlashSnapshot({ cards: [...accumulated] });
                } else if (ev.type === "error") {
                  onToast(`Batch ${i + 1} failed: ${ev.message}`, "error");
                }
              },
            },
          );

          if (i < numBatches - 1) {
            await new Promise((r) => window.setTimeout(r, 250));
          }
        }
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Flashcard generation failed.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [activeSessionId, draft, isLoading, numCards, onToast, persistFlashSnapshot],
  );

  const goTo = (idx: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, idx));
    setCurrentIndex(next);
    persistFlashSnapshot({ currentIndex: next });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Card area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-center">
        {!cards.length && !isLoading && (
          <p className="text-sm text-zinc-400 italic text-center">
            Enter a topic and generate flashcards. Click a card to flip it.
          </p>
        )}

        {isLoading && (
          <div className="flex flex-col items-center gap-4 fade-in">
            <div className="skeleton rounded-2xl w-full" style={{ height: "220px" }} />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        )}

        {cards.length > 0 && (
          <>
            <FlashcardView
              key={cards[currentIndex]?.id}
              card={cards[currentIndex]!}
              index={currentIndex}
              total={cards.length}
            />
            {/* Navigation */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="rounded-lg border border-[var(--ax-border)] px-4 py-2 text-sm font-medium text-[var(--ax-text)] transition-all hover:bg-[var(--ax-surface-subtle)] disabled:opacity-30"
              >
                ← Previous
              </button>
              {/* Dot indicators */}
              <div className="flex gap-1">
                {cards.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === currentIndex ? "w-4 bg-[var(--ax-accent)]" : "w-1.5 bg-[var(--ax-border-strong)]"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === cards.length - 1}
                className="rounded-lg border border-[var(--ax-border)] px-4 py-2 text-sm font-medium text-[var(--ax-text)] transition-all hover:bg-[var(--ax-surface-subtle)] disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-[var(--ax-border)] bg-[var(--ax-surface)]/95 px-5 py-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--ax-text-tertiary)]">
          <span className="uppercase tracking-wider">flashcards</span>
          <label className="flex items-center gap-1.5">
            <span>Cards:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={numCards || ""}
              onChange={(e) => setNumCards(parseInt(e.target.value) || 0)}
              onBlur={() => setNumCards(Math.min(Math.max(numCards || 1, 1), 100))}
              className="w-16 rounded border border-[var(--ax-border)] bg-[var(--ax-surface)] px-2 py-0.5 text-xs text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent)] focus:ring-1 focus:ring-[var(--ax-accent)] transition-all"
            />
          </label>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isLoading}
            placeholder="Topic to generate flashcards for…"
            className="min-w-0 flex-1 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2 text-sm text-[var(--ax-text)] outline-none transition-colors placeholder:text-[var(--ax-text-tertiary)] focus:border-[var(--ax-accent)] disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={isLoading || !draft.trim()}
            className="rounded-lg bg-[var(--ax-accent)] px-4 py-2 text-sm font-medium text-[var(--ax-accent-fg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Generating…" : "Generate"}
          </button>
        </form>
      </div>
    </div>
  );
});
