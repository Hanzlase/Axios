"use client";

import { memo, useCallback, useEffect, useState } from "react";

import { streamAgentResponse, fetchSessionResults, type AgentStreamEvent, type PlanDay } from "@/lib/api";

type PlannerPanelProps = {
  activeSessionId: string;
  onToast: (message: string, variant: "success" | "error") => void;
};

export const PlannerPanel = memo(function PlannerPanel({
  activeSessionId,
  onToast,
}: PlannerPanelProps) {
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState<PlanDay[]>([]);
  const [numDays, setNumDays] = useState(7);

  useEffect(() => {
    setIsRestoring(true);
    setSchedule([]);
    setTitle("");
    fetchSessionResults(activeSessionId)
      .then((r) => {
        if (r.results.plan?.schedule?.length) {
          setTitle(r.results.plan.title ?? "");
          setSchedule(r.results.plan.schedule);
        }
      })
      .catch(() => {})
      .finally(() => setIsRestoring(false));
  }, [activeSessionId]);


  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const msg = draft.trim();
      if (!msg || isLoading) return;
      setDraft("");
      setIsLoading(true);
      setSchedule([]);
      setTitle("");

      const BATCH_SIZE = 30;
      const totalRequested = numDays;
      const numBatches = Math.ceil(totalRequested / BATCH_SIZE);
      const accumulated: PlanDay[] = [];

      try {
        for (let i = 0; i < numBatches; i++) {
          const countForBatch = Math.min(BATCH_SIZE, totalRequested - i * BATCH_SIZE);
          const batchMsg = i === 0 ? msg : `Continue the study plan for: ${msg}. Generate days ${i * BATCH_SIZE + 1} to ${i * BATCH_SIZE + countForBatch}.`;
          
          await streamAgentResponse(
            { session_id: activeSessionId, message: batchMsg, mode: "plan", num_days: countForBatch },
            {
              onEvent: (ev: AgentStreamEvent) => {
                if (ev.type === "result" && ev.mode === "plan") {
                  if (i === 0) setTitle(ev.data.title);
                  // Adjust day numbers for later batches if needed, but the model usually follows the prompt
                  accumulated.push(...ev.data.schedule);
                  setSchedule([...accumulated]);
                } else if (ev.type === "error") {
                  onToast(`Batch ${i + 1} failed: ${ev.message}`, "error");
                }
              },
            },
          );
        }
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Plan generation failed.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [activeSessionId, draft, isLoading, numDays, onToast],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Plan output */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {!schedule.length && !isLoading && (
          <p className="text-sm text-[var(--ax-text-tertiary)] italic">
            Describe what you want to learn and over how many days. A structured plan will appear here.
          </p>
        )}

        {isLoading && (
          <div className="space-y-3 fade-in">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-4 space-y-2">
                <div className="skeleton h-3 w-32 rounded" />
                <div className="skeleton h-3 w-56 rounded" />
                <div className="skeleton h-3 w-44 rounded" />
              </div>
            ))}
          </div>
        )}

        {schedule.length > 0 && (
          <div className="fade-in space-y-3">
            {title && (
              <h2 className="text-base font-semibold text-[var(--ax-text)] mb-4">{title}</h2>
            )}
            {/* Table layout for larger screens, cards for small */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--ax-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--ax-border)] bg-[var(--ax-surface-subtle)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)] w-16">Day</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)]">Topic</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)]">Tasks</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ax-text-tertiary)] w-28">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ax-border)] bg-[var(--ax-surface)]">
                  {schedule.map((day) => (
                    <tr key={day.day} className="hover:bg-[var(--ax-surface-subtle)] transition-colors">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ax-accent)] text-xs font-semibold text-[var(--ax-accent-fg)]">
                          {day.day}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--ax-text)]">{day.topic}</p>
                        {day.label && day.label !== `Day ${day.day}` && (
                          <p className="text-xs text-[var(--ax-text-secondary)] mt-0.5">{day.label}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1">
                          {(day.tasks || []).map((task, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[var(--ax-text-secondary)]">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ax-text-tertiary)]" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-[var(--ax-text-tertiary)] text-xs">{day.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="md:hidden space-y-3">
              {schedule.map((day) => (
                <div key={day.day} className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ax-accent)] text-xs font-bold text-[var(--ax-accent-fg)]">
                      {day.day}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--ax-text)]">{day.topic}</p>
                      <p className="text-xs text-[var(--ax-text-tertiary)]">{day.duration}</p>
                    </div>
                  </div>
                  <ul className="space-y-1 pl-1">
                    {(day.tasks || []).map((task, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--ax-text-secondary)]">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ax-text-tertiary)]" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-[var(--ax-border)] bg-[var(--ax-surface)]/95 px-5 py-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--ax-text-tertiary)]">
          <span className="uppercase tracking-wider">study planner</span>
          <label className="flex items-center gap-1.5">
            <span>Days:</span>
            <input
              type="number"
              min={1}
              max={90}
              value={numDays || ""}
              onChange={(e) => setNumDays(parseInt(e.target.value) || 0)}
              onBlur={() => setNumDays(Math.min(Math.max(numDays || 1, 1), 90))}
              className="w-16 rounded border border-[var(--ax-border)] bg-[var(--ax-surface)] px-2 py-0.5 text-xs text-[var(--ax-text)] outline-none focus:border-[var(--ax-accent)] focus:ring-1 focus:ring-[var(--ax-accent)] transition-all"
            />
          </label>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isLoading}
            placeholder="What do you want to study and over how long?"
            className="min-w-0 flex-1 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2 text-sm text-[var(--ax-text)] outline-none transition-colors placeholder:text-[var(--ax-text-tertiary)] focus:border-[var(--ax-accent)] disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={isLoading || !draft.trim()}
            className="rounded-lg bg-[var(--ax-accent)] px-4 py-2 text-sm font-medium text-[var(--ax-accent-fg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Planning…" : "Plan"}
          </button>
        </form>
      </div>
    </div>
  );
});
