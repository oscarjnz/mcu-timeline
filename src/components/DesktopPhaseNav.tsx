"use client";

import { phases } from "@/data/phases";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";

interface DesktopPhaseNavProps {
  activePhase: number;
}

export function DesktopPhaseNav({ activePhase }: DesktopPhaseNavProps) {
  const { language } = useLanguage();

  return (
    <nav
      aria-label={language === "es" ? "Navegación por fase" : "Phase navigation"}
      className="flex flex-col gap-0.5"
    >
      {phases.map((phase) => {
        const colors = phaseColors[phase.number];
        const active = phase.number === activePhase;
        return (
          <a
            key={phase.number}
            href={`#phase-${phase.number}`}
            aria-current={active ? "true" : undefined}
            className={`rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              active
                ? `${colors.accentBorder} bg-zinc-100 font-semibold ${colors.accentText} dark:bg-zinc-900`
                : "border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {language === "es" ? phase.nameEs : phase.nameEn}
          </a>
        );
      })}
    </nav>
  );
}
