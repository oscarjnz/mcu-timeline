"use client";

import { useLanguage } from "@/lib/language-context";

interface MoviesOnlyToggleProps {
  moviesOnly: boolean;
  onToggle: () => void;
}

export function MoviesOnlyToggle({ moviesOnly, onToggle }: MoviesOnlyToggleProps) {
  const { language } = useLanguage();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={moviesOnly}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        moviesOnly
          ? "border-red-600 bg-red-100 text-red-800 dark:border-red-500 dark:bg-red-950 dark:text-red-300"
          : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {language === "es" ? "Solo películas" : "Movies only"}
    </button>
  );
}
