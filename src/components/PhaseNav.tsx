"use client";

import { phases } from "@/data/phases";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";

interface PhaseNavProps {
  activePhase: number;
}

export function PhaseNav({ activePhase }: PhaseNavProps) {
  const { language } = useLanguage();

  return (
    <nav
      aria-label={language === "es" ? "Navegación por fase" : "Phase navigation"}
      className="no-scrollbar sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0 dark:border-zinc-800 dark:bg-black/90"
    >
      {phases.map((phase) => {
        const colors = phaseColors[phase.number];
        const active = phase.number === activePhase;
        return (
          <a
            key={phase.number}
            href={`#phase-${phase.number}`}
            aria-current={active ? "true" : undefined}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${colors.accentBorder} ${
              active
                ? `${colors.accentBg} text-white shadow-sm`
                : `${colors.accentText} hover:bg-zinc-100 dark:hover:bg-zinc-800`
            }`}
          >
            {language === "es" ? phase.nameEs : phase.nameEn}
          </a>
        );
      })}
    </nav>
  );
}
