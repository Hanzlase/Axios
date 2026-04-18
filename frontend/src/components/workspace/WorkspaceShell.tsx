"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchHealth,
  fetchStatus,
  fetchUploadStatus,
  deleteSession as apiDeleteSession,
  uploadFiles,
  type AgentMode,
  type StatusResponse,
  type UploadFileRecord,
} from "@/lib/api";

import {
  getOrBootstrap,
  createSession,
  renameSession,
  deleteStoredSession,
  setActiveSessionId as persistActiveSessionId,
  loadSessionUiState,
  patchSessionUiState,
  type StoredSession,
} from "@/lib/session";

import { ChatStreamPanel } from "@/components/workspace/ChatStreamPanel";
import { ExplainPanel } from "@/components/workspace/ExplainPanel";
import { FlashcardPanel } from "@/components/workspace/FlashcardPanel";
import { PlannerPanel } from "@/components/workspace/PlannerPanel";
import { QuizPanel } from "@/components/workspace/QuizPanel";
import { ExportButton } from "@/components/workspace/ExportButton";

type ConnectionState = "checking" | "connected" | "disconnected";
type ToastVariant = "success" | "error";
type UploadItemStatus =
  | "ready"
  | "uploading"
  | "queued"
  | "processing"
  | "processed"
  | "failed";

type DocumentItem = {
  id: string;
  name: string;
  status: "indexed" | "processing" | "queued" | "failed";
};

type UploadItem = {
  local_id: string;
  name: string;
  extension: string;
  size: number;
  status: UploadItemStatus;
  progress: number;
  file?: File;
  file_id?: string;
  error?: string;
};

type ToastMessage = {
  id: string;
  message: string;
  variant: ToastVariant;
};

const SUPPORTED_EXTENSIONS = new Set(["pdf", "docx", "txt", "csv"]);

const INITIAL_DOCUMENTS: DocumentItem[] = [];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function statusDotClass(connection: ConnectionState): string {
  if (connection === "connected") {
    return "bg-[var(--ax-success)]";
  }
  if (connection === "disconnected") {
    return "bg-[var(--ax-danger)]";
  }
  return "bg-[var(--ax-text-tertiary)]";
}

function connectionLabel(connection: ConnectionState): string {
  if (connection === "connected") {
    return "connected";
  }
  if (connection === "disconnected") {
    return "disconnected";
  }
  return "checking backend";
}

function toastClass(variant: ToastVariant): string {
  if (variant === "success") {
    return "ax-toast ax-toast-success";
  }
  if (variant === "error") {
    return "ax-toast ax-toast-error";
  }
  return "ax-toast bg-[var(--ax-surface-subtle)] text-[var(--ax-text)] border-[var(--ax-border)]";
}

function statusBadgeClass(status: string): string {
  if (status === "ready" || status === "processed") {
    return "ax-badge-done";
  }
  if (status === "failed") {
    return "ax-badge-fail";
  }
  if (status === "processing") {
    return "ax-badge-proc";
  }
  if (status === "uploading") {
    return "ax-badge-upload";
  }
  return "ax-badge-queued";
}

function extensionFromName(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function isSupportedFile(file: File): boolean {
  return SUPPORTED_EXTENSIONS.has(extensionFromName(file.name));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapUploadRecordStatus(status: UploadFileRecord["status"]): UploadItemStatus {
  if (status === "processed") {
    return "processed";
  }
  if (status === "processing") {
    return "processing";
  }
  if (status === "failed") {
    return "failed";
  }
  return "queued";
}

export function WorkspaceShell() {
  const [connection, setConnection] = useState<ConnectionState>("checking");

  // Keep setters for now (used by backend polling), discard state values to avoid unused lint.
  const [, setBackendMeta] = useState<StatusResponse | null>(null);
  const [, setHealthLatency] = useState<number | null>(null);
  const [, setLastHealthTs] = useState<string | null>(null);
  const [, setIsBackendLoading] = useState(true);

  // Bootstrap sessions synchronously via lazy initializer (avoids setState-in-effect).
  const [{ sessions: initialSessions, activeId: initialActiveId }] = useState(() => getOrBootstrap());
  const [activeSessionId, setActiveSessionId] = useState<string>(initialActiveId);
  const [sessions, setSessions] = useState<StoredSession[]>(initialSessions);

  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(() => {
    const ui = loadSessionUiState(initialActiveId);
    return (ui.activeDocumentId as string | null | undefined) ?? null;
  });

  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

  const [activeMode, setActiveMode] = useState<AgentMode>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("axion_activeMode") : null;
    return (saved as AgentMode) || "chat";
  });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("axion_theme") : null;
    return (saved as "light" | "dark" | null) || "light";
  });

  // Apply theme to the DOM when it changes.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("axion_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const handleSetActiveMode = useCallback((mode: AgentMode) => {
    setActiveMode(mode);
    localStorage.setItem("axion_activeMode", mode);
  }, []);

  const handleSetActiveSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      persistActiveSessionId(sessionId);
      // Close mobile drawer after selection.
      setIsMobileLeftOpen(false);
      setIsMobileRightOpen(false);
    },
    [],
  );

  const handleNewSession = useCallback(() => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    handleSetActiveSession(session.id);
  }, [handleSetActiveSession]);

  const handleRenameSession = useCallback((e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    const newTitle = window.prompt("Enter new session name:", currentTitle);
    if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
      renameSession(id, newTitle.trim());
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s)));
    }
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = createId("toast");
    setToasts((current) => [...current, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const handleDeleteSession = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (sessions.length <= 1) {
        addToast("Cannot delete the last remaining session.", "error");
        return;
      }
      if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
        const newSessions = deleteStoredSession(id);
        setSessions(newSessions);
        if (activeSessionId === id && newSessions.length > 0) {
          handleSetActiveSession(newSessions[0].id);
        }
        // Notify backend to clear the session context
        apiDeleteSession(id).catch(console.error);
      }
    },
    [sessions, activeSessionId, addToast, handleSetActiveSession],
  );

  const statusPollingRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshBackendState = useCallback(async (signal?: AbortSignal) => {
    try {
      const [health, status] = await Promise.all([
        fetchHealth(signal),
        fetchStatus(signal),
      ]);

      setConnection("connected");
      setBackendMeta(status);
      setHealthLatency(health.response_ms ?? null);
      setLastHealthTs(health.timestamp);
    } catch {
      setConnection("disconnected");
    } finally {
      setIsBackendLoading(false);
    }
  }, []);

  const syncUploadStateWithServer = useCallback((files: UploadFileRecord[]) => {
    const byFileId = new Map(files.map((file) => [file.file_id, file]));

    setUploadItems((current) =>
      current.map((item) => {
        if (!item.file_id) {
          return item;
        }
        const record = byFileId.get(item.file_id);
        if (!record) {
          return item;
        }
        return {
          ...item,
          status: mapUploadRecordStatus(record.status),
          progress: 100,
          error: record.error ?? undefined,
        };
      }),
    );

    setDocuments((current) => {
      const docMap = new Map(current.map((doc) => [doc.id, doc]));
      for (const file of files) {
        const mappedStatus: DocumentItem["status"] =
          file.status === "processed"
            ? "indexed"
            : file.status === "processing"
              ? "processing"
              : file.status === "failed"
                ? "failed"
                : "queued";

        const existing = docMap.get(file.file_id);
        if (existing) {
          docMap.set(file.file_id, { ...existing, status: mappedStatus });
        } else {
          docMap.set(file.file_id, {
            id: file.file_id,
            name: file.filename,
            status: mappedStatus,
          });
        }
      }
      return Array.from(docMap.values());
    });
  }, []);

  const stopStatusPolling = useCallback(() => {
    if (statusPollingRef.current !== null) {
      window.clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }
  }, []);

  const startStatusPolling = useCallback(
    (sessionId: string) => {
      stopStatusPolling();
      statusPollingRef.current = window.setInterval(() => {
        void fetchUploadStatus(sessionId)
          .then((response) => {
            syncUploadStateWithServer(response.files);
            const hasPending = response.files.some(
              (file) => file.status === "queued" || file.status === "processing",
            );
            if (!hasPending) {
              stopStatusPolling();
            }
          })
          .catch(() => {
            stopStatusPolling();
          });
      }, 1500);
    },
    [stopStatusPolling, syncUploadStateWithServer],
  );

  useEffect(() => {
    const controller = new AbortController();
    const startupTimer = window.setTimeout(() => {
      void refreshBackendState(controller.signal);
    }, 0);

    const intervalId = window.setInterval(() => {
      void refreshBackendState();
    }, 30000);

    return () => {
      controller.abort();
      window.clearTimeout(startupTimer);
      window.clearInterval(intervalId);
    };
  }, [refreshBackendState]);

  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  const activeSession = useMemo(
    () =>
      sessions.find((s) => s.id === activeSessionId) ??
      sessions[0] ?? { title: "Session", id: "", createdAt: "" },
    [activeSessionId, sessions],
  );

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? null,
    [documents, activeDocumentId],
  );

  // When active session changes, persist it + restore per-session selected document + refresh documents list.
  useEffect(() => {
    persistActiveSessionId(activeSessionId);

    // Clear previous session's doc list immediately to avoid stale UI while fetching.
    // Defer to avoid cascading-render warnings from calling setState directly in an effect.
    const clearTimer = window.setTimeout(() => {
      setDocuments([]);
      setUploadItems([]);
      setActiveDocumentId(null);
    }, 0);

    const ui = loadSessionUiState(activeSessionId);
    const desired = (ui.activeDocumentId as string | null | undefined) ?? null;
    const timer = window.setTimeout(() => setActiveDocumentId(desired), 0);

    const controller = new AbortController();
    void fetchUploadStatus(activeSessionId, controller.signal)
      .then((r) => syncUploadStateWithServer(r.files))
      .catch(() => {
        // backend offline → keep local UI state
      });

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [activeSessionId, syncUploadStateWithServer]);

  const handleSelectDocument = useCallback(
    (docId: string) => {
      setActiveDocumentId(docId);
      patchSessionUiState(activeSessionId, { activeDocumentId: docId });
      setIsMobileLeftOpen(false);
    },
    [activeSessionId],
  );

  const addFilesToQueue = useCallback(
    (files: File[]) => {
      const unsupported = files.filter((file) => !isSupportedFile(file));
      const supported = files.filter((file) => isSupportedFile(file));

      if (unsupported.length > 0) {
        addToast(
          `Skipped ${unsupported.length} unsupported file(s). Use PDF, DOCX, TXT, or CSV.`,
          "error",
        );
      }

      if (supported.length === 0) {
        return;
      }

      setUploadItems((current) => {
        const existingKeys = new Set(
          current.map((item) => `${item.name}:${item.size}:${item.extension}`),
        );
        const next = [...current];
        for (const file of supported) {
          const extension = extensionFromName(file.name);
          const dedupeKey = `${file.name}:${file.size}:${extension}`;
          if (existingKeys.has(dedupeKey)) {
            continue;
          }
          existingKeys.add(dedupeKey);
          next.unshift({
            local_id: createId("upload"),
            name: file.name,
            extension,
            size: file.size,
            status: "ready",
            progress: 0,
            file,
          });
        }
        return next;
      });
    },
    [addToast],
  );

  const onFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const pickedFiles = event.target.files ? Array.from(event.target.files) : [];
      if (pickedFiles.length > 0) {
        addFilesToQueue(pickedFiles);
      }
      event.target.value = "";
    },
    [addFilesToQueue],
  );

  const onDropFiles = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      const dropped = Array.from(event.dataTransfer.files || []);
      if (dropped.length > 0) {
        addFilesToQueue(dropped);
      }
    },
    [addFilesToQueue],
  );

  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onUpload = useCallback(async () => {
    if (isUploading) {
      return;
    }

    const readyItems = uploadItems.filter((item) => item.status === "ready" && item.file);
    if (readyItems.length === 0) {
      addToast("Add files before uploading.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const readyIds = new Set(readyItems.map((item) => item.local_id));
    setUploadItems((current) =>
      current.map((item) =>
        readyIds.has(item.local_id)
          ? { ...item, status: "uploading", progress: 0, error: undefined }
          : item,
      ),
    );

    try {
      const filesToSend = readyItems
        .map((item) => item.file)
        .filter((file): file is File => Boolean(file));

      const response = await uploadFiles(filesToSend, activeSessionId, (percent) => {
        setUploadProgress(percent);
        setUploadItems((current) =>
          current.map((item) =>
            readyIds.has(item.local_id) ? { ...item, progress: percent } : item,
          ),
        );
      });

      const acceptedByIndex = response.files;
      setUploadItems((current) => {
        let acceptedPointer = 0;
        return current.map((item) => {
          if (!readyIds.has(item.local_id)) {
            return item;
          }

          const accepted = acceptedByIndex[acceptedPointer];
          acceptedPointer += 1;

          if (!accepted) {
            return {
              ...item,
              status: "failed",
              progress: 100,
              error: "File was not accepted by the API.",
            };
          }

          return {
            ...item,
            status: mapUploadRecordStatus(accepted.status),
            progress: 100,
            file_id: accepted.file_id,
          };
        });
      });

      syncUploadStateWithServer(response.files);

      if (response.rejected_count > 0) {
        addToast(`${response.rejected_count} file(s) were rejected by the backend.`, "error");
      }

      addToast(
        `Queued ${response.accepted_count} file(s) for session ${response.session_id}.`,
        "success",
      );

      const hasPending = response.files.some(
        (file) => file.status === "queued" || file.status === "processing",
      );
      if (hasPending) {
        startStatusPolling(response.session_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setUploadItems((current) =>
        current.map((item) =>
          readyIds.has(item.local_id)
            ? {
                ...item,
                status: "failed",
                progress: 100,
                error: message,
              }
            : item,
        ),
      );
      addToast(message, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [
    isUploading,
    uploadItems,
    addToast,
    activeSessionId,
    startStatusPolling,
    syncUploadStateWithServer,
  ]);

  const readyCount = useMemo(
    () => uploadItems.filter((item) => item.status === "ready").length,
    [uploadItems],
  );

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setHasMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    // Close drawers on desktop.
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileLeftOpen(false);
        setIsMobileRightOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-[var(--ax-bg)] text-[var(--ax-text)]">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col px-3 py-3 sm:px-5 sm:py-5">
        <header className="mb-3 flex items-center justify-between rounded-xl border border-[var(--ax-border)] bg-[var(--ax-surface)] px-4 py-3 shadow-[var(--ax-shadow)]">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-[var(--ax-text-tertiary)]">
              Axion
            </p>
            <h1 className="text-base font-semibold tracking-tight">
              AI Workspace Foundation
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-full border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] p-2 text-[var(--ax-text-secondary)] hover:bg-[var(--ax-surface-subtle)] hover:text-[var(--ax-text)] transition-colors"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              )}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] px-3 py-1.5 text-xs text-[var(--ax-text-secondary)]">
              <span className={`h-2 w-2 rounded-full ${statusDotClass(connection)}`} />
              {connectionLabel(connection)}
            </div>
          </div>
        </header>

        {/* Mobile drawer toggles */}
        <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setIsMobileLeftOpen((v) => !v);
              setIsMobileRightOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2 text-xs font-medium text-[var(--ax-text)] shadow-sm"
            aria-expanded={isMobileLeftOpen}
            aria-label="Open sessions and documents"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>
            Sessions
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileRightOpen((v) => !v);
              setIsMobileLeftOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2 text-xs font-medium text-[var(--ax-text)] shadow-sm"
            aria-expanded={isMobileRightOpen}
            aria-label="Open controls and uploads"
          >
            Controls
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Mobile overlay */}
        {(isMobileLeftOpen || isMobileRightOpen) && (
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => {
              setIsMobileLeftOpen(false);
              setIsMobileRightOpen(false);
            }}
            aria-hidden="true"
          />
        )}

        {/* Mobile drawers */}
        <div
          className={
            "fixed left-0 top-0 z-50 h-full w-[86vw] max-w-[340px] transform transition-transform duration-200 lg:hidden " +
            (isMobileLeftOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          <div className="h-full bg-[var(--ax-bg)] p-3">
            <aside className="ax-panel flex h-full flex-col min-h-0 overflow-y-auto">
              {/* LEFT SIDEBAR */}
              <div className="border-b border-[var(--ax-border)] px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.14em] text-[var(--ax-text-tertiary]">
                    Sessions
                  </h2>
                  <button
                    type="button"
                    onClick={handleNewSession}
                    className="rounded-md p-1 text-[var(--ax-text-tertiary)] hover:bg-[var(--ax-surface-subtle)] hover:text-[var(--ax-text)] transition-colors"
                    aria-label="New session"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSetActiveSession(session.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleSetActiveSession(session.id);
                        }
                      }}
                      className={`group flex w-full items-center justify-between rounded-md border px-3 py-2 text-left cursor-pointer transition-all duration-150 ${
                        session.id === activeSessionId
                          ? "border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)]"
                          : "border-transparent hover:border-[var(--ax-border)] hover:bg-[var(--ax-surface-subtle)]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ax-text)]">
                          {session.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--ax-text-tertiary)]">
                          {hasMounted
                            ? new Date(session.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                      {session.id === activeSessionId && (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleRenameSession(e, session.id, session.title)}
                            className="rounded p-1 text-[var(--ax-text-tertiary)] hover:bg-[var(--ax-surface-raised)] hover:text-[var(--ax-text)]"
                            title="Rename Session"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className="rounded p-1 text-[var(--ax-text-tertiary)] hover:bg-[var(--ax-surface-subtle)] hover:text-[var(--ax-danger)]"
                            title="Delete Session"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-[var(--ax-border)] px-4 py-4">
                <h2 className="text-xs uppercase tracking-[0.14em] text-[var(--ax-text-tertiary)]">
                  Documents
                </h2>
                <div className="mt-3 space-y-2">
                  {documents.length === 0 && (
                    <p className="text-xs text-[var(--ax-text-tertiary)]">No documents yet.</p>
                  )}
                  {documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => handleSelectDocument(document.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left transition-all duration-150 ${
                        document.id === activeDocumentId
                          ? "border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)]"
                          : "border-transparent hover:border-[var(--ax-border)] hover:bg-[var(--ax-surface-subtle)]"
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-[var(--ax-text)]">
                        {document.name}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] ${statusBadgeClass(
                          document.status,
                        )}`}
                      >
                        {document.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>


            </aside>
          </div>
        </div>

        <div
          className={
            "fixed right-0 top-0 z-50 h-full w-[86vw] max-w-[360px] transform transition-transform duration-200 lg:hidden " +
            (isMobileRightOpen ? "translate-x-0" : "translate-x-full")
          }
        >
          <div className="h-full bg-[var(--ax-bg)] p-3">
            <aside className="ax-panel flex h-full flex-col min-h-0 overflow-y-auto">
              {/* RIGHT SIDEBAR - Controls & Uploads */}
              <div className="border-b border-[var(--ax-border)] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--ax-text-tertiary)]">
                      Active Session
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold tracking-tight">
                      {activeSession.title}
                    </h2>
                  </div>
                  {activeSessionId && (
                    <ExportButton
                      activeSessionId={activeSessionId}
                      contentType={activeMode === "quiz" || activeMode === "flashcards" || activeMode === "plan" ? activeMode : "chat"}
                      onToast={addToast}
                    />
                  )}
                </div>
                {/* Mode selector */}
                <div className="mt-3 flex gap-1 flex-wrap">
                  {([
                    { mode: "chat", label: "Chat" },
                    { mode: "explain", label: "Explain" },
                    { mode: "quiz", label: "Quiz" },
                    { mode: "flashcards", label: "Flashcards" },
                    { mode: "plan", label: "Plan" },
                  ] as { mode: AgentMode; label: string }[]).map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => handleSetActiveMode(item.mode)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        activeMode === item.mode
                          ? "border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-accent-fg)]"
                          : "border-[var(--ax-border)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-b border-[var(--ax-border)] px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--ax-text-tertiary)]">
                    File Ingestion
                  </p>
                  <button
                    type="button"
                    disabled={isUploading || readyCount === 0}
                    onClick={() => void onUpload()}
                    className="rounded-md border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ax-text)] transition-all duration-200 hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? "Uploading..." : `Upload ${readyCount > 0 ? `(${readyCount})` : ""}`}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.csv"
                  className="hidden"
                  onChange={onFileInputChange}
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={triggerFilePicker}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true); }}
                  onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={(event) => { event.preventDefault(); setIsDragActive(false); }}
                  onDrop={onDropFiles}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      triggerFilePicker();
                    }
                  }}
                  className={`mt-3 cursor-pointer rounded-xl border border-dashed p-4 transition-all duration-200 ${
                    isDragActive
                      ? "border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)]"
                      : "border-[var(--ax-border)] bg-[var(--ax-surface)] hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)]"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--ax-text)]">
                    Drag and drop files, or click to choose
                  </p>
                  <p className="mt-1 text-xs text-[var(--ax-text-secondary)]">
                    Supports PDF, DOCX, TXT, CSV. Multiple files per upload.
                  </p>
                </div>

                {isUploading && (
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ax-surface-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--ax-accent)] transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--ax-text-secondary]">Upload progress: {uploadProgress}%</p>
                  </div>
                )}

                {uploadItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadItems.map((item) => (
                      <div
                        key={item.local_id}
                        className="fade-in rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-[var(--ax-text)]">{item.name}</p>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.1em] ${statusBadgeClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--ax-text-tertiary)]">
                          {item.extension.toUpperCase()} | {formatFileSize(item.size)}
                        </p>
                        {item.status === "uploading" && (
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ax-surface-subtle)]">
                            <div
                              className="h-full rounded-full bg-[var(--ax-accent)] transition-all duration-150"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                        {item.error && (
                          <p className="mt-1 text-xs text-[var(--ax-danger)]">{item.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--ax-text-tertiary)]">
                  Document Focus
                </p>
                <div className="mt-3 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] p-3">
                  {activeDocument ? (
                    <>
                      <p className="text-sm font-medium text-[var(--ax-text)]">{activeDocument.name}</p>
                      <p className="mt-1 text-sm text-[var(--ax-text-secondary)]">
                        Context panel is staged for references, citations, and chunk previews.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--ax-text-secondary)]">
                      Upload and select a document to view focused context.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <main className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          {/* LEFT SIDEBAR */}
          <aside className="ax-panel hidden lg:flex flex-col min-h-0 overflow-y-auto">
            <div className="border-b border-[var(--ax-border)] px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-[0.14em] text-[var(--ax-text-tertiary]">
                  Sessions
                </h2>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="rounded-md p-1 text-[var(--ax-text-tertiary)] hover:bg-[var(--ax-surface-subtle)] hover:text-[var(--ax-text)] transition-colors"
                  aria-label="New session"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSetActiveSession(session.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSetActiveSession(session.id);
                      }
                    }}
                    className={`group flex w-full items-center justify-between rounded-md border px-3 py-2 text-left cursor-pointer transition-all duration-150 ${
                      session.id === activeSessionId
                        ? "border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)]"
                        : "border-transparent hover:border-[var(--ax-border)] hover:bg-[var(--ax-surface-subtle)]"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ax-text)]">
                        {session.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ax-text-tertiary)]">
                        {hasMounted
                          ? new Date(session.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                    {session.id === activeSessionId && (
                      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleRenameSession(e, session.id, session.title)}
                          className="rounded p-1 text-[var(--ax-text-tertiary)] hover:bg-[var(--ax-surface-raised)] hover:text-[var(--ax-text)]"
                          title="Rename Session"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          className="rounded p-1 text-[var(--ax-text-tertiary)] hover:bg-[var(--ax-surface-subtle)] hover:text-[var(--ax-danger)]"
                          title="Delete Session"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-[var(--ax-border)] px-4 py-4">
              <h2 className="text-xs uppercase tracking-[0.14em] text-[var(--ax-text-tertiary)]">
                Documents
              </h2>
              <div className="mt-3 space-y-2">
                {documents.length === 0 && (
                  <p className="text-xs text-[var(--ax-text-tertiary)]">No documents yet.</p>
                )}
                {documents.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => handleSelectDocument(document.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-all duration-150 ${
                      document.id === activeDocumentId
                        ? "border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)]"
                        : "border-transparent hover:border-[var(--ax-border)] hover:bg-[var(--ax-surface-subtle)]"
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-[var(--ax-text)]">
                      {document.name}
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] ${statusBadgeClass(
                        document.status,
                      )}`}
                    >
                      {document.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>


          </aside>

          {/* MIDDLE SECTION - Mode-aware panel */}
          <section className="ax-panel flex min-h-0 flex-col overflow-hidden relative">
            {activeMode === "chat" && (
              <ChatStreamPanel
                key={`chat-${activeSessionId}`}
                activeSessionId={activeSessionId}
                onToast={addToast}
              />
            )}
            {activeMode === "explain" && (
              <ExplainPanel
                key={`explain-${activeSessionId}`}
                activeSessionId={activeSessionId}
                onToast={addToast}
              />
            )}
            {activeMode === "quiz" && (
              <QuizPanel
                key={`quiz-${activeSessionId}`}
                activeSessionId={activeSessionId}
                onToast={addToast}
              />
            )}
            {activeMode === "flashcards" && (
              <FlashcardPanel
                key={`flashcards-${activeSessionId}`}
                activeSessionId={activeSessionId}
                onToast={addToast}
              />
            )}
            {activeMode === "plan" && (
              <PlannerPanel
                key={`plan-${activeSessionId}`}
                activeSessionId={activeSessionId}
                onToast={addToast}
              />
            )}
          </section>

          {/* RIGHT SIDEBAR - Controls & Uploads */}
          <aside className="ax-panel hidden lg:flex flex-col min-h-0 overflow-y-auto">
            {/* Session header + mode tabs */}
            <div className="border-b border-[var(--ax-border)] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--ax-text-tertiary)]">
                    Active Session
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold tracking-tight">
                    {activeSession.title}
                  </h2>
                </div>
                {activeSessionId && (
                  <ExportButton
                    activeSessionId={activeSessionId}
                    contentType={activeMode === "quiz" || activeMode === "flashcards" || activeMode === "plan" ? activeMode : "chat"}
                    onToast={addToast}
                  />
                )}
              </div>
              {/* Mode selector */}
              <div className="mt-3 flex gap-1 flex-wrap">
                {([
                  { mode: "chat", label: "Chat" },
                  { mode: "explain", label: "Explain" },
                  { mode: "quiz", label: "Quiz" },
                  { mode: "flashcards", label: "Flashcards" },
                  { mode: "plan", label: "Plan" },
                ] as { mode: AgentMode; label: string }[]).map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleSetActiveMode(item.mode)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                      activeMode === item.mode
                        ? "border-[var(--ax-accent)] bg-[var(--ax-accent)] text-[var(--ax-accent-fg)]"
                        : "border-[var(--ax-border)] text-[var(--ax-text-secondary)] hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-[var(--ax-border)] px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--ax-text-tertiary)]">
                  File Ingestion
                </p>
                <button
                  type="button"
                  disabled={isUploading || readyCount === 0}
                  onClick={() => void onUpload()}
                  className="rounded-md border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ax-text)] transition-all duration-200 hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? "Uploading..." : `Upload ${readyCount > 0 ? `(${readyCount})` : ""}`}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.csv"
                className="hidden"
                onChange={onFileInputChange}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={triggerFilePicker}
                onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true); }}
                onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }}
                onDragLeave={(event) => { event.preventDefault(); setIsDragActive(false); }}
                onDrop={onDropFiles}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    triggerFilePicker();
                  }
                }}
                className={`mt-3 cursor-pointer rounded-xl border border-dashed p-4 transition-all duration-200 ${
                  isDragActive
                    ? "border-[var(--ax-border-strong)] bg-[var(--ax-surface-subtle)]"
                    : "border-[var(--ax-border)] bg-[var(--ax-surface)] hover:border-[var(--ax-border-strong)] hover:bg-[var(--ax-surface-subtle)]"
                }`}
              >
                <p className="text-sm font-medium text-[var(--ax-text)]">
                  Drag and drop files, or click to choose
                </p>
                <p className="mt-1 text-xs text-[var(--ax-text-secondary)]">
                  Supports PDF, DOCX, TXT, CSV. Multiple files per upload.
                </p>
              </div>

              {isUploading && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ax-surface-subtle)]">
                    <div
                      className="h-full rounded-full bg-[var(--ax-accent)] transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--ax-text-secondary]">Upload progress: {uploadProgress}%</p>
                </div>
              )}

              {uploadItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadItems.map((item) => (
                    <div
                      key={item.local_id}
                      className="fade-in rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[var(--ax-text)]">{item.name}</p>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.1em] ${statusBadgeClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--ax-text-tertiary)]">
                        {item.extension.toUpperCase()} | {formatFileSize(item.size)}
                      </p>
                      {item.status === "uploading" && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ax-surface-subtle)]">
                          <div
                            className="h-full rounded-full bg-[var(--ax-accent)] transition-all duration-150"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      {item.error && (
                        <p className="mt-1 text-xs text-[var(--ax-danger)]">{item.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--ax-text-tertiary)]">
                Document Focus
              </p>
              <div className="mt-3 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-surface-subtle)] p-3">
                {activeDocument ? (
                  <>
                    <p className="text-sm font-medium text-[var(--ax-text)]">{activeDocument.name}</p>
                    <p className="mt-1 text-sm text-[var(--ax-text-secondary)]">
                      Context panel is staged for references, citations, and chunk previews.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[var(--ax-text-secondary)]">
                    Upload and select a document to view focused context.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-80 flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`fade-in rounded-lg border px-3 py-2 text-sm shadow-sm ${toastClass(
                toast.variant,
              )}`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
