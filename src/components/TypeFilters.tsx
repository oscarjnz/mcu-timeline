"use client";

import type { EntryType } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";

const typeLabels: Record<EntryType, { es: string; en: string }> = {
  movie: { es: "Películas", en: "Movies" },
  tv: { es: "Series", en: "TV shows" },
  "one-shot": { es: "One-shots", en: "One-shots" },
  special: { es: "Especiales", en: "Specials" },
};

const allTypes: EntryType[] = ["movie", "tv", "one-shot", "special"];

interface TypeFiltersProps {
  activeTypes: Set<EntryType>;
  onToggleType: (type: EntryType) => void;
}

export function TypeFilters({ activeTypes, onToggleType }: TypeFiltersProps) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-wrap gap-2 py-3">
      {allTypes.map((type) => {
        const active = activeTypes.has(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggleType(type)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {language === "es" ? typeLabels[type].es : typeLabels[type].en}
          </button>
        );
      })}
    </div>
  );
}
