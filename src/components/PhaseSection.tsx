"use client";

import type { Phase, TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";
import { TimelineEntryCard } from "@/components/TimelineEntryCard";

interface PhaseSectionProps {
  phase: Phase;
  entries: TimelineEntry[];
}

export function PhaseSection({ phase, entries }: PhaseSectionProps) {
  const { language } = useLanguage();
  const colors = phaseColors[phase.number];

  return (
    <section id={`phase-${phase.number}`} className="scroll-mt-20 py-8">
      <header className="mb-4">
        <h2 className={`text-2xl font-bold ${colors.accentText}`}>
          {language === "es"
            ? `Fase ${phase.number}: ${phase.nameEs}`
            : `Phase ${phase.number}: ${phase.nameEn}`}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {language === "es" ? phase.subtitleEs : phase.subtitleEn}
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {language === "es"
            ? "No hay entradas para los filtros seleccionados."
            : "No entries match the selected filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((entry) => (
            <TimelineEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
