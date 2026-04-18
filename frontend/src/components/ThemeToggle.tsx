"use client";

import { useEffect, useState } from "react";
import { getStoredTheme, applyTheme, type Theme } from "@/lib/theme";

/** Hydrates the theme once on client mount to avoid flash. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // This runs once on client, before paint as much as possible
    applyTheme(getStoredTheme());
  }, []);
  return <>{children}</>;
}

/** Compact icon-only toggle used in nav/header bars. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getStoredTheme());
    // Keep in sync if another tab changes it
    const handler = (e: StorageEvent) => {
      if (e.key === "axion_theme" || e.key === "theme") {
        setTheme(getStoredTheme());
        applyTheme(getStoredTheme());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ax-border)] bg-[var(--ax-surface)] text-[var(--ax-text)] transition-all hover:bg-[var(--ax-surface-subtle)] focus:outline-none ${className}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        // Sun
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}

/** Hook for consuming theme in components. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return { theme, toggle, isDark: theme === "dark" };
}
