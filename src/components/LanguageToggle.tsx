"use client";

import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-label={language === "es" ? "Cambiar a inglés" : "Switch to Spanish"}
    >
      <span className={language === "es" ? "font-bold" : "text-zinc-400 dark:text-zinc-500"}>
        ES
      </span>
      <span className="text-zinc-400 dark:text-zinc-600">/</span>
      <span className={language === "en" ? "font-bold" : "text-zinc-400 dark:text-zinc-500"}>
        EN
      </span>
    </button>
  );
}
