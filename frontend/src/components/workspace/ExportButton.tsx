"use client";

import { memo, useCallback, useRef, useState } from "react";
import { exportSession, type ExportContentType, type ExportFormat } from "@/lib/api";

type ExportButtonProps = {
  activeSessionId: string;
  contentType: ExportContentType;
  onToast: (message: string, variant: "success" | "error") => void;
};

export const ExportButton = memo(function ExportButton({
  activeSessionId,
  contentType,
  onToast,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setIsOpen(false);
      if (isExporting) return;
      setIsExporting(true);
      onToast(`Exporting ${contentType} as ${format.toUpperCase()}...`, "success");

      try {
        const { blob, filename } = await exportSession(activeSessionId, format, contentType);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke on next tick so the download has time to start in some browsers.
        setTimeout(() => URL.revokeObjectURL(url), 0);
        onToast("Export successful.", "success");
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Export failed.", "error");
      } finally {
        setIsExporting(false);
      }
    },
    [activeSessionId, contentType, isExporting, onToast],
  );

  const showCsv = contentType === "flashcards" || contentType === "plan" || contentType === "quiz";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={isExporting}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ax-text)] transition-all duration-200 hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        {isExporting ? "Exporting..." : "Export"}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] py-1 shadow-[var(--ax-shadow)] z-50">
          <button
            type="button"
            onClick={() => void handleExport("markdown")}
            className="w-full px-4 py-2 text-left text-xs font-medium text-[var(--ax-text)] hover:bg-[var(--ax-surface-subtle)]"
          >
            Markdown (.md)
          </button>
          <button
            type="button"
            onClick={() => void handleExport("pdf")}
            className="w-full px-4 py-2 text-left text-xs font-medium text-[var(--ax-text)] hover:bg-[var(--ax-surface-subtle)]"
          >
            PDF (.pdf)
          </button>
          {showCsv && (
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              className="w-full px-4 py-2 text-left text-xs font-medium text-[var(--ax-text)] hover:bg-[var(--ax-surface-subtle)]"
            >
              CSV (.csv)
            </button>
          )}
        </div>
      )}
    </div>
  );
});
