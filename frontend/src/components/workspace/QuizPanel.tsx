"use client";

import { memo, useCallback, useEffect, useState } from "react";

import {
  streamAgentResponse,
  fetchSessionResults,
  type AgentStreamEvent,
  type QuizQuestion,
} from "@/lib/api";

import { loadSessionUiState, patchSessionUiState } from "@/lib/session";

type QuizPanelProps = {
  activeSessionId: string;
  onToast: (message: string, variant: "success" | "error") => void;
};

type AnswerMap = Record<number, string>; // questionId → chosen letter

function letterFromOption(option: string): string {
  return option.charAt(0).toUpperCase();
}

const QuizCard = memo(function QuizCard({
  q,
  index,
  chosen,
  revealed,
  onChoose,
}: {
  q: QuizQuestion;
  index: number;
  chosen: string | undefined;
  revealed: boolean;
  onChoose: (letter: string) => void;
}) {
  const correct = q.correct.toUpperCase();

  return (
    <div className="fade-in rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-[var(--ax-text-tertiary)] mb-2">Q{index + 1}</p>
      <p className="text-sm font-medium text-[var(--ax-text)] mb-4">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt) => {
          const letter = letterFromOption(opt);
          const isChosen = chosen === letter;
          const isCorrect = letter === correct;
          let cls =
            "w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-all duration-150 cursor-pointer ";
          if (!revealed) {
            cls += isChosen
              ? "border-[var(--ax-border-strong)] bg-[var(--ax-surface-raised)] text-[var(--ax-text)]"
              : "border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-raised)]";
          } else {
            if (isCorrect) {
              cls += "border-[var(--ax-success)] bg-[var(--ax-success)] text-white font-medium";
            } else if (isChosen && !isCorrect) {
              cls += "border-[var(--ax-danger)] bg-[var(--ax-danger)] text-white line-through";
            } else {
              cls += "border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] text-[var(--ax-text-tertiary)]";
            }
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => !revealed && onChoose(letter)}
              className={cls}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && q.explanation && (
        <p className="mt-3 text-xs text-[var(--ax-text-secondary)] border-t border-[var(--ax-border)] pt-2">
          💡 {q.explanation}
        </p>
      )}
    </div>
  );
});

export const QuizPanel = memo(function QuizPanel({ activeSessionId, onToast }: QuizPanelProps) {
  const restored = loadSessionUiState(activeSessionId);

  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    (restored.quiz?.questions as QuizQuestion[] | undefined) ?? [],
  );
  const [answers, setAnswers] = useState<AnswerMap>(restored.quiz?.answers ?? {});
  const [revealed, setRevealed] = useState<boolean>(restored.quiz?.revealed ?? false);
  const [numQ, setNumQ] = useState<number>(restored.quiz?.numQ ?? 5);

  // Rehydrate on session change
  useEffect(() => {
    const ui = loadSessionUiState(activeSessionId);
    const timer = window.setTimeout(() => {
      setQuestions((ui.quiz?.questions as QuizQuestion[] | undefined) ?? []);
      setAnswers(ui.quiz?.answers ?? {});
      setRevealed(ui.quiz?.revealed ?? false);
      setNumQ(ui.quiz?.numQ ?? 5);
    }, 0);

    // Also pull server persisted results as a fallback (first time on a device)
    fetchSessionResults(activeSessionId)
      .then((r) => {
        if (r.results.quiz?.questions?.length) {
          setQuestions(r.results.quiz.questions);
          patchSessionUiState(activeSessionId, {
            quiz: {
              ...(loadSessionUiState(activeSessionId).quiz ?? {}),
              questions: r.results.quiz.questions,
            },
          });
        }
      })
      .catch(() => {
        /* server offline — fine */
      });

    return () => window.clearTimeout(timer);
  }, [activeSessionId]);

  // Persist knobs
  useEffect(() => {
    patchSessionUiState(activeSessionId, {
      quiz: {
        ...(loadSessionUiState(activeSessionId).quiz ?? {}),
        numQ,
      },
    });
  }, [activeSessionId, numQ]);

  const persistQuizSnapshot = useCallback(
    (next: { questions?: QuizQuestion[]; answers?: AnswerMap; revealed?: boolean }) => {
      const current = loadSessionUiState(activeSessionId).quiz ?? {};
      patchSessionUiState(activeSessionId, {
        quiz: {
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
      setQuestions([]);
      setAnswers({});
      setRevealed(false);
      persistQuizSnapshot({ questions: [], answers: {}, revealed: false });

      const BATCH_SIZE = 10;
      const totalRequested = Math.max(1, Math.min(numQ, 50));
      const numBatches = Math.ceil(totalRequested / BATCH_SIZE);
      const accumulated: QuizQuestion[] = [];

      try {
        for (let i = 0; i < numBatches; i++) {
          const countForBatch = Math.min(BATCH_SIZE, totalRequested - i * BATCH_SIZE);
          const batchMsg =
            i === 0
              ? msg
              : `Generate ${countForBatch} more quiz questions for: ${msg}. Avoid repeats.`;

          await streamAgentResponse(
            { session_id: activeSessionId, message: batchMsg, mode: "quiz", num_questions: countForBatch },
            {
              onEvent: (ev: AgentStreamEvent) => {
                if (ev.type === "result" && ev.mode === "quiz") {
                  accumulated.push(...ev.data.questions);
                  setQuestions([...accumulated]);
                  persistQuizSnapshot({ questions: [...accumulated] });
                } else if (ev.type === "error") {
                  onToast(`Batch ${i + 1} failed: ${ev.message}`, "error");
                }
              },
            },
          );

          // small spacing between batches to avoid backend/LLM rate spikes
          if (i < numBatches - 1) {
            await new Promise((r) => window.setTimeout(r, 250));
          }
        }
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Quiz generation failed.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [activeSessionId, draft, isLoading, numQ, onToast, persistQuizSnapshot],
  );

  const score = questions.filter(
    (q) => answers[q.id]?.toUpperCase() === q.correct.toUpperCase(),
  ).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Questions output */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {!questions.length && !isLoading && (
          <p className="text-sm text-[var(--ax-text-tertiary)] italic">
            Describe the topic you want to be quizzed on. Questions will appear here.
          </p>
        )}

        {isLoading && (
          <div className="space-y-3 fade-in">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-5 space-y-2">
                <div className="skeleton h-3 w-48 rounded" />
                <div className="skeleton h-3 w-64 rounded" />
                <div className="skeleton h-3 w-40 rounded" />
              </div>
            ))}
          </div>
        )}

        {questions.map((q, i) => (
          <QuizCard
            key={q.id}
            q={q}
            index={i}
            chosen={answers[q.id]}
            revealed={revealed}
            onChoose={(letter) =>
              setAnswers((a) => {
                const next = { ...a, [q.id]: letter };
                persistQuizSnapshot({ answers: next });
                return next;
              })
            }
          />
        ))}

        {questions.length > 0 && (
          <div className="flex items-center gap-3 pt-2">
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                disabled={Object.keys(answers).length < questions.length}
                className="rounded-lg bg-[var(--ax-accent)] px-5 py-2 text-sm font-medium text-[var(--ax-accent-fg)] transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit Quiz
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-[var(--ax-text)]">
                  Score: {score} / {questions.length}
                </span>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full border ${
                    score === questions.length
                      ? "border-[var(--ax-success)] bg-[var(--ax-success)] text-white"
                      : score >= questions.length / 2
                        ? "border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-accent-fg)]"
                        : "border-[var(--ax-danger)] bg-[var(--ax-danger)] text-white"
                  }`}
                >
                  {score === questions.length
                    ? "Perfect!"
                    : score >= questions.length / 2
                      ? "Good job"
                      : "Keep studying"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-[var(--ax-border)] bg-[var(--ax-surface)]/95 px-5 py-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--ax-text-tertiary)]">
          <span className="uppercase tracking-wider">quiz generator</span>
          <label className="flex items-center gap-1.5">
            <span>Questions:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={numQ || ""}
              onChange={(e) => setNumQ(parseInt(e.target.value) || 0)}
              onBlur={() => setNumQ(Math.min(Math.max(numQ || 1, 1), 50))}
              className="w-16 rounded border border-[var(--ax-border)] bg-[var(--ax-surface)] px-2 py-0.5 text-xs text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent)] focus:ring-1 focus:ring-[var(--ax-accent)] transition-all"
            />
          </label>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isLoading}
            placeholder="Enter a topic to generate quiz questions…"
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
