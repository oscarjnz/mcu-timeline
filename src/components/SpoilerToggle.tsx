"use client";

import { useSpoilerMode } from "@/lib/spoiler-context";
import { useLanguage } from "@/lib/language-context";

export function SpoilerToggle() {
  const { spoilerModeOn, toggleSpoilerMode } = useSpoilerMode();
  const { language } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleSpoilerMode}
      aria-pressed={spoilerModeOn}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        spoilerModeOn
          ? "border-amber-500 bg-amber-100 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-300"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }`}
      aria-label={
        language === "es"
          ? spoilerModeOn
            ? "Desactivar modo sin spoilers"
            : "Activar modo sin spoilers"
          : spoilerModeOn
            ? "Turn off spoiler-safe mode"
            : "Turn on spoiler-safe mode"
      }
    >
      {language === "es" ? "Sin spoilers" : "Spoiler-safe"}
    </button>
  );
}
