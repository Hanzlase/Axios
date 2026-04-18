/** Single source of truth for Axion theme management. */

const KEY = "axion_theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(KEY) as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  // Fallback to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem(KEY, theme);
  // Also keep legacy key in sync for backward compatibility
  localStorage.setItem("theme", theme);
}

export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
