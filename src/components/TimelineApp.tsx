"use client";

import { useEffect, useMemo, useState } from "react";
import { phases } from "@/data/phases";
import { timeline } from "@/data/timeline";
import type { EntryType } from "@/types/timeline";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PhaseNav } from "@/components/PhaseNav";
import { TypeFilters } from "@/components/TypeFilters";
import { PhaseSection } from "@/components/PhaseSection";

const allTypes: EntryType[] = ["movie", "tv", "one-shot", "special"];

function TimelineContent() {
  const { language } = useLanguage();
  const [activeTypes, setActiveTypes] = useState<Set<EntryType>>(new Set(allTypes));
  const [activePhase, setActivePhase] = useState(1);

  useEffect(() => {
    const sections = phases
      .map((phase) => document.getElementById(`phase-${phase.number}`))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const phaseNumber = Number(visible[0].target.id.replace("phase-", ""));
          setActivePhase(phaseNumber);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function toggleType(type: EntryType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next.size === 0 ? new Set(allTypes) : next;
    });
  }

  const entriesByPhase = useMemo(() => {
    const filtered = timeline.filter((entry) => activeTypes.has(entry.type));
    const grouped = new Map<number, typeof timeline>();
    for (const phase of phases) {
      grouped.set(
        phase.number,
        filtered
          .filter((entry) => entry.phase === phase.number)
          .sort((a, b) => a.order - b.order),
      );
    }
    return grouped;
  }, [activeTypes]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <header className="flex items-center justify-between py-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {language === "es" ? "Timeline del UCM" : "MCU Timeline"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {language === "es"
              ? "Orden cronológico narrativo completo"
              : "Complete narrative chronological order"}
          </p>
        </div>
        <LanguageToggle />
      </header>

      <PhaseNav activePhase={activePhase} />
      <TypeFilters activeTypes={activeTypes} onToggleType={toggleType} />

      <main className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {phases.map((phase) => (
          <PhaseSection
            key={phase.number}
            phase={phase}
            entries={entriesByPhase.get(phase.number) ?? []}
          />
        ))}
      </main>
    </div>
  );
}

export function TimelineApp() {
  return (
    <LanguageProvider>
      <TimelineContent />
    </LanguageProvider>
  );
}
