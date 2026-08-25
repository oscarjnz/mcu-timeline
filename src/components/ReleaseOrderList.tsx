"use client";

import type { TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { getReleaseDate, getReleaseYear } from "@/lib/tmdb";
import { TimelineEntryCard } from "@/components/TimelineEntryCard";

interface ReleaseOrderListProps {
  entries: TimelineEntry[];
  onOpenEntry: (id: string) => void;
}

interface YearGroup {
  year: number | null;
  entries: TimelineEntry[];
}

function sortByReleaseDate(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.slice().sort((a, b) => {
    const dateA = getReleaseDate(a.id);
    const dateB = getReleaseDate(b.id);
    if (dateA && dateB) return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    if (dateA) return -1;
    if (dateB) return 1;
    // Sin fecha de estreno resuelta (ej. entradas sin match en TMDB): al final, por orden narrativo.
    return a.order - b.order;
  });
}

function groupByYear(entries: TimelineEntry[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const entry of entries) {
    const year = getReleaseYear(entry.id);
    const last = groups[groups.length - 1];
    if (last && last.year === year) {
      last.entries.push(entry);
    } else {
      groups.push({ year, entries: [entry] });
    }
  }
  return groups;
}

export function ReleaseOrderList({ entries, onOpenEntry }: ReleaseOrderListProps) {
  const { language } = useLanguage();
  const sorted = sortByReleaseDate(entries);
  const groups = groupByYear(sorted);

  if (groups.length === 0) {
    return (
      <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
        {language === "es"
          ? "No hay entradas para los filtros seleccionados."
          : "No entries match the selected filters."}
      </p>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {groups.map((group) => (
        <section key={`${group.year ?? "unknown"}-${group.entries[0].id}`} className="py-8">
          <header className="mb-4">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {group.year ?? (language === "es" ? "Sin fecha de estreno" : "No release date")}
            </h2>
          </header>
          <div className="flex flex-col gap-4">
            {group.entries.map((entry) => (
              <TimelineEntryCard key={entry.id} entry={entry} onOpen={onOpenEntry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
