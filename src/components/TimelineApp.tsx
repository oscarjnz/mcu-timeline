"use client";

import { useEffect, useMemo, useState } from "react";
import { phases } from "@/data/phases";
import { timeline } from "@/data/timeline";
import type { EntryType, TimelineEntry } from "@/types/timeline";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { SpoilerProvider } from "@/lib/spoiler-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SpoilerToggle } from "@/components/SpoilerToggle";
import { PhaseNav } from "@/components/PhaseNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { TypeFilters } from "@/components/TypeFilters";
import { MoviesOnlyToggle } from "@/components/MoviesOnlyToggle";
import { ViewModeToggle, type ViewMode } from "@/components/ViewModeToggle";
import { PhaseSection } from "@/components/PhaseSection";
import { ReleaseOrderList } from "@/components/ReleaseOrderList";
import { DoomsdayCountdownView } from "@/components/DoomsdayCountdownView";
import { EntryDetailModal } from "@/components/EntryDetailModal";

const allTypes: EntryType[] = ["movie", "tv", "one-shot", "special"];

interface PhaseRun {
  key: string;
  sectionId: string;
  phaseNumber: number;
  entries: TimelineEntry[];
}

// Agrupa la lista ya ordenada por `order` en "corridas" consecutivas del mismo
// numero de fase. Con la Fase 0 (X-Men) intercalada por su propia fecha
// in-universe, una fase del UCM puede partirse en varias corridas separadas
// por peliculas de X-Men; cada corrida se renderiza como su propia seccion,
// pero solo la primera corrida de cada numero de fase recibe el id
// `phase-{numero}` que usa la nav sticky para saltar a ella.
function groupIntoRuns(sortedEntries: TimelineEntry[]): PhaseRun[] {
  const runs: PhaseRun[] = [];
  const seenPhases = new Set<number>();
  for (const entry of sortedEntries) {
    const last = runs[runs.length - 1];
    if (last && last.phaseNumber === entry.phase) {
      last.entries.push(entry);
      continue;
    }
    const isFirstRunForPhase = !seenPhases.has(entry.phase);
    seenPhases.add(entry.phase);
    runs.push({
      key: `${entry.phase}-${runs.length}`,
      sectionId: isFirstRunForPhase ? `phase-${entry.phase}` : `phase-${entry.phase}-run-${runs.length}`,
      phaseNumber: entry.phase,
      entries: [entry],
    });
  }
  return runs;
}

function TimelineContent() {
  const { language } = useLanguage();
  const [activeTypes, setActiveTypes] = useState<Set<EntryType>>(new Set(allTypes));
  const [moviesOnly, setMoviesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chronological");
  const [activePhase, setActivePhase] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    function readFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setSelectedEntryId(params.get("entry"));
    }
    readFromUrl();
    window.addEventListener("popstate", readFromUrl);
    return () => window.removeEventListener("popstate", readFromUrl);
  }, []);

  function openEntry(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("entry", id);
    window.history.pushState({ entryModal: true }, "", url);
    setSelectedEntryId(id);
  }

  function closeEntry() {
    if ((window.history.state as { entryModal?: boolean } | null)?.entryModal) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("entry");
    window.history.replaceState({}, "", url);
    setSelectedEntryId(null);
  }

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

  const filteredEntries = useMemo(() => {
    return timeline.filter(
      (entry) => activeTypes.has(entry.type) && (!moviesOnly || entry.type === "movie"),
    );
  }, [activeTypes, moviesOnly]);

  const runs = useMemo(() => {
    if (viewMode !== "chronological") return [];
    const sorted = filteredEntries.slice().sort((a, b) => a.order - b.order);
    return groupIntoRuns(sorted);
  }, [filteredEntries, viewMode]);

  const doomsdayEntries = useMemo(
    () => filteredEntries.filter((entry) => entry.inDoomsdayCountdown),
    [filteredEntries],
  );

  useEffect(() => {
    if (viewMode !== "chronological") return;

    const sections = runs
      .map((run) => document.getElementById(run.sectionId))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const phaseNumber = Number(
            (visible[0].target as HTMLElement).dataset.phaseNumber ?? "0",
          );
          setActivePhase(phaseNumber);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [runs, viewMode]);

  const selectedEntry = selectedEntryId
    ? timeline.find((entry) => entry.id === selectedEntryId) ?? null
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 lg:flex-row lg:items-start lg:gap-10 lg:px-8 lg:py-8">
      {/* Cabecera y controles para mobile/tablet: apilados arriba del contenido, ocultos desde lg. */}
      <div className="flex flex-col lg:hidden">
        <header className="flex items-center justify-between gap-2 py-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {language === "es" ? "Timeline del UCM" : "MCU Timeline"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {language === "es"
                ? "Orden cronológico narrativo completo, con X-Men (Earth-10005) intercalado"
                : "Complete narrative chronological order, with X-Men (Earth-10005) interleaved"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SpoilerToggle />
            <LanguageToggle />
          </div>
        </header>

        <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />

        {viewMode === "chronological" && <PhaseNav activePhase={activePhase} />}

        <div className="flex flex-wrap items-center gap-2 py-3">
          <TypeFilters activeTypes={activeTypes} onToggleType={toggleType} />
          <MoviesOnlyToggle moviesOnly={moviesOnly} onToggle={() => setMoviesOnly((prev) => !prev)} />
        </div>
      </div>

      {/* Sidebar fija para laptop/desktop: mismos controles, en columna, ocultos hasta lg. */}
      <DesktopSidebar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        activePhase={activePhase}
        activeTypes={activeTypes}
        onToggleType={toggleType}
        moviesOnly={moviesOnly}
        onToggleMoviesOnly={() => setMoviesOnly((prev) => !prev)}
      />

      <div className="min-w-0 flex-1 pb-8 lg:max-w-3xl lg:pb-16">
        {viewMode === "chronological" && (
          <main className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {runs.map((run) => {
              const phase = phases.find((p) => p.number === run.phaseNumber);
              if (!phase) return null;
              return (
                <PhaseSection
                  key={run.key}
                  sectionId={run.sectionId}
                  phase={phase}
                  entries={run.entries}
                  onOpenEntry={openEntry}
                />
              );
            })}
          </main>
        )}

        {viewMode === "release" && (
          <main>
            <ReleaseOrderList entries={filteredEntries} onOpenEntry={openEntry} />
          </main>
        )}

        {viewMode === "doomsday" && (
          <main>
            <DoomsdayCountdownView entries={doomsdayEntries} onOpenEntry={openEntry} />
          </main>
        )}
      </div>

      {selectedEntry && <EntryDetailModal entry={selectedEntry} onClose={closeEntry} />}
    </div>
  );
}

export function TimelineApp() {
  return (
    <LanguageProvider>
      <SpoilerProvider>
        <TimelineContent />
      </SpoilerProvider>
    </LanguageProvider>
  );
}
