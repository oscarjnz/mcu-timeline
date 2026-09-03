"use client";

import { useEffect, useRef } from "react";
import { phases } from "@/data/phases";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";

interface PhaseNavProps {
  activePhase: number;
}

export function PhaseNav({ activePhase }: PhaseNavProps) {
  const { language } = useLanguage();
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // No usar scrollIntoView: dentro de un ancestro `sticky`, Safari/iOS lo
    // calcula sobre la posicion de flujo sin "stickear", no la posicion
    // real en pantalla, y termina arrastrando el scroll de toda la pagina
    // hacia arriba en vez de mover solo este nav horizontal. Se centra el
    // pill activo scrolleando directamente el contenedor del nav.
    const nav = navRef.current;
    const pill = activeRef.current;
    if (!nav || !pill) return;
    const target = pill.offsetLeft - (nav.clientWidth - pill.clientWidth) / 2;
    nav.scrollTo({
      left: Math.max(0, Math.min(target, nav.scrollWidth - nav.clientWidth)),
      behavior: "smooth",
    });
  }, [activePhase]);

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md sm:mx-0 dark:border-zinc-800/80 dark:bg-zinc-950/85">
      <div className="relative">
        <nav
          ref={navRef}
          aria-label={language === "es" ? "Navegación por fase" : "Phase navigation"}
          className="no-scrollbar flex snap-x snap-proximity gap-2 overflow-x-auto scroll-px-4 px-4 py-3 sm:px-0"
        >
          {phases.map((phase) => {
            const colors = phaseColors[phase.number];
            const active = phase.number === activePhase;
            return (
              <a
                key={phase.number}
                ref={active ? activeRef : undefined}
                href={`#phase-${phase.number}`}
                aria-current={active ? "true" : undefined}
                className={`shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ease-out active:scale-95 ${colors.accentBorder} ${
                  active
                    ? `${colors.accentBg} text-white shadow-sm shadow-black/10`
                    : `${colors.accentText} hover:bg-zinc-100 dark:hover:bg-zinc-900`
                }`}
              >
                {language === "es" ? phase.nameEs : phase.nameEn}
              </a>
            );
          })}
        </nav>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent dark:from-zinc-950" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent dark:from-zinc-950" />
      </div>
    </div>
  );
}
