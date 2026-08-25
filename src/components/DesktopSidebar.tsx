"use client";

import type { EntryType } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SpoilerToggle } from "@/components/SpoilerToggle";
import { ViewModeToggle, type ViewMode } from "@/components/ViewModeToggle";
import { TypeFilters } from "@/components/TypeFilters";
import { MoviesOnlyToggle } from "@/components/MoviesOnlyToggle";
import { DesktopPhaseNav } from "@/components/DesktopPhaseNav";

interface DesktopSidebarProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  activePhase: number;
  activeTypes: Set<EntryType>;
  onToggleType: (type: EntryType) => void;
  moviesOnly: boolean;
  onToggleMoviesOnly: () => void;
}

export function DesktopSidebar({
  viewMode,
  onChangeViewMode,
  activePhase,
  activeTypes,
  onToggleType,
  moviesOnly,
  onToggleMoviesOnly,
}: DesktopSidebarProps) {
  const { language } = useLanguage();

  return (
    <aside className="hidden shrink-0 lg:sticky lg:top-8 lg:flex lg:h-[calc(100vh-4rem)] lg:w-64 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:pb-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {language === "es" ? "Timeline del UCM" : "MCU Timeline"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {language === "es"
            ? "Orden cronológico narrativo completo, con X-Men (Earth-10005) intercalado"
            : "Complete narrative chronological order, with X-Men (Earth-10005) interleaved"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <SpoilerToggle />
        <LanguageToggle />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          {language === "es" ? "Vista" : "View"}
        </p>
        <ViewModeToggle viewMode={viewMode} onChange={onChangeViewMode} />
      </div>

      {viewMode === "chronological" && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            {language === "es" ? "Fases" : "Phases"}
          </p>
          <DesktopPhaseNav activePhase={activePhase} />
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          {language === "es" ? "Filtros" : "Filters"}
        </p>
        <div className="flex flex-col gap-2">
          <TypeFilters activeTypes={activeTypes} onToggleType={onToggleType} />
          <MoviesOnlyToggle moviesOnly={moviesOnly} onToggle={onToggleMoviesOnly} />
        </div>
      </div>
    </aside>
  );
}
