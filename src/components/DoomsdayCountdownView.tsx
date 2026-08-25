"use client";

import type { TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { TimelineEntryCard } from "@/components/TimelineEntryCard";

interface DoomsdayCountdownViewProps {
  entries: TimelineEntry[];
  onOpenEntry: (id: string) => void;
}

export function DoomsdayCountdownView({ entries, onOpenEntry }: DoomsdayCountdownViewProps) {
  const { language } = useLanguage();
  const sorted = entries.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="py-8">
      <div className="mb-6 rounded-lg border border-yellow-500 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-500 dark:bg-yellow-950 dark:text-yellow-200">
        {language === "es"
          ? "Esta es la lista esencial \"Countdown to Doomsday\" que Disney+ publico para ponerse al dia antes de Avengers: Doomsday (18 de diciembre de 2026): las peliculas y series que preparan directamente el terreno del multiverso, en su orden cronologico narrativo. Incluye X-Men (2000) y X2, las dos entradas de Earth-10005 que Disney+ confirmo como parte de esta lista."
          : "This is Disney+'s official \"Countdown to Avengers: Doomsday\" essential watchlist (released Dec 18, 2026): the movies and series that directly set up the multiverse stakes, in their narrative chronological order. It includes X-Men (2000) and X2, the two Earth-10005 entries Disney+ confirmed as part of this list."}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {language === "es"
            ? "No hay entradas para los filtros seleccionados."
            : "No entries match the selected filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((entry) => (
            <TimelineEntryCard key={entry.id} entry={entry} onOpen={onOpenEntry} />
          ))}
        </div>
      )}
    </div>
  );
}
