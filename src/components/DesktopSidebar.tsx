"use client";

import type { EntryType, PhaseNumber } from "@/types/timeline";
import { phases } from "@/data/phases";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";
import { anton } from "@/lib/display-font";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SpoilerToggle } from "@/components/SpoilerToggle";
import type { ViewMode } from "@/components/ViewModeToggle";
import { TypeFilters } from "@/components/TypeFilters";
import { MoviesOnlyToggle } from "@/components/MoviesOnlyToggle";

interface DesktopSidebarProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  activePhase: number;
  activeTypes: Set<EntryType>;
  onToggleType: (type: EntryType) => void;
  moviesOnly: boolean;
  onToggleMoviesOnly: () => void;
  /** Entradas visibles con los filtros actuales, por fase. */
  phaseCounts: Record<PhaseNumber, number>;
  totalVisible: number;
}

const viewOptions: { mode: ViewMode; es: string; en: string; hintEs: string; hintEn: string }[] = [
  {
    mode: "chronological",
    es: "Cronológico",
    en: "Chronological",
    hintEs: "Orden narrativo dentro de la historia",
    hintEn: "Narrative order inside the story",
  },
  {
    mode: "release",
    es: "Orden de estreno",
    en: "Release order",
    hintEs: "Como llegaron a cines y streaming",
    hintEn: "As they hit theaters and streaming",
  },
  {
    mode: "doomsday",
    es: "Countdown to Doomsday",
    en: "Countdown to Doomsday",
    hintEs: "La lista esencial antes del estreno",
    hintEn: "The essential pre-release watchlist",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-500">
      {children}
    </p>
  );
}

export function DesktopSidebar({
  viewMode,
  onChangeViewMode,
  activePhase,
  activeTypes,
  onToggleType,
  moviesOnly,
  onToggleMoviesOnly,
  phaseCounts,
  totalVisible,
}: DesktopSidebarProps) {
  const { language } = useLanguage();
  const es = language === "es";

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-80 lg:flex-col lg:border-r lg:border-zinc-200 lg:bg-zinc-50/95 lg:backdrop-blur-md dark:lg:border-zinc-800 dark:lg:bg-zinc-950/95">
      {/* Encabezado fijo */}
      <div className="border-b border-zinc-200 px-6 pt-6 pb-5 dark:border-zinc-800">
        <a href="#top" className="group inline-flex items-center gap-3">
          <span
            className={`${anton.className} inline-block -skew-x-6 bg-[#ED1D24] px-2.5 py-0.5 text-2xl leading-tight tracking-wide text-white shadow-sm shadow-red-900/30`}
          >
            MARVEL
          </span>
          <span className="text-sm font-semibold tracking-wide text-zinc-800 uppercase dark:text-zinc-100">
            {es ? "Timeline del UCM" : "MCU Timeline"}
          </span>
        </a>
        <p className="mt-3 text-[13px] leading-snug text-zinc-500 dark:text-zinc-400">
          {es
            ? "Orden cronológico narrativo completo, con X-Men (Earth-10005) intercalado."
            : "Complete narrative chronological order, with X-Men (Earth-10005) interleaved."}
        </p>
        <p className="mt-2 text-xs font-medium text-zinc-400 tabular-nums dark:text-zinc-500">
          {es ? `${totalVisible} entradas visibles` : `${totalVisible} entries shown`}
        </p>
      </div>

      {/* Zona central con scroll propio */}
      <div className="thin-scrollbar flex-1 overflow-y-auto px-3 py-5">
        <div>
          <SectionLabel>{es ? "Vista" : "View"}</SectionLabel>
          <div role="tablist" aria-label={es ? "Vista del timeline" : "Timeline view"} className="flex flex-col gap-1">
            {viewOptions.map((option) => {
              const active = option.mode === viewMode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChangeViewMode(option.mode)}
                  className={`rounded-lg px-3 py-2 text-left transition-colors duration-150 ${
                    active
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
                  }`}
                >
                  <span className="block text-sm font-semibold">{es ? option.es : option.en}</span>
                  <span
                    className={`block text-xs ${
                      active ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-500"
                    }`}
                  >
                    {es ? option.hintEs : option.hintEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {viewMode === "chronological" && (
          <div className="mt-6">
            <SectionLabel>{es ? "Fases" : "Phases"}</SectionLabel>
            <nav aria-label={es ? "Navegación por fase" : "Phase navigation"} className="flex flex-col gap-0.5">
              {phases.map((phase) => {
                const colors = phaseColors[phase.number];
                const active = phase.number === activePhase;
                const count = phaseCounts[phase.number] ?? 0;
                return (
                  <a
                    key={phase.number}
                    href={`#phase-${phase.number}`}
                    aria-current={active ? "true" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 ${
                      active ? "bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800" : "hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70"
                    } ${count === 0 ? "opacity-40" : ""}`}
                  >
                    <span
                      className={`absolute inset-y-1.5 left-0 w-1 rounded-full ${colors.accentBg} transition-opacity ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.accentBg}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                        {phase.number === 0 ? "Earth-10005" : es ? `Fase ${phase.number}` : `Phase ${phase.number}`}
                      </span>
                      <span
                        className={`block truncate text-sm font-semibold ${
                          active ? colors.accentText : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {phase.number === 0 ? "X-Men" : es ? phase.nameEs : phase.nameEn}
                      </span>
                    </span>
                    <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-zinc-800 dark:text-zinc-400">
                      {count}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        )}

        <div className="mt-6">
          <SectionLabel>{es ? "Filtros" : "Filters"}</SectionLabel>
          <div className="flex flex-col gap-1 px-3 [&>div]:py-0">
            <TypeFilters activeTypes={activeTypes} onToggleType={onToggleType} />
            <div className="pt-2">
              <MoviesOnlyToggle moviesOnly={moviesOnly} onToggle={onToggleMoviesOnly} />
            </div>
          </div>
        </div>
      </div>

      {/* Pie fijo con los toggles globales */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <SpoilerToggle />
        <LanguageToggle />
      </div>
    </aside>
  );
}
