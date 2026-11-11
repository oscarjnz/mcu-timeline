"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";

// Estreno en cines de Avengers: Doomsday: 18 de diciembre de 2026. Se cuenta
// hasta la medianoche local de ese dia (cada visitante ve su propia cuenta,
// igual que el reloj de los teasers oficiales, que marca el dia de estreno).
const RELEASE = new Date(2026, 11, 18, 0, 0, 0);

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function getRemaining(now: number): Remaining {
  const diff = Math.max(0, RELEASE.getTime() - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: diff === 0,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

interface DoomsdayTimerProps {
  onOpen: () => void;
  /**
   * "floating": fijo en la esquina superior derecha, solo en pantallas anchas
   *   (>= 1880px, breakpoint `3xl`) donde queda espacio libre a la derecha de la columna de contenido.
   * "header": dentro de la fila de encabezado de la columna de contenido, para
   *   desktop angosto (lg a 1879px), donde flotando taparia las tarjetas.
   * "inline": arriba del header en mobile, a todo el ancho.
   * Nunca reservar espacio vacio (padding fijo) para que el timer flotante no
   * tape nada: eso dejaba un hueco grande arriba del contenido.
   */
  variant: "floating" | "header" | "inline";
}

export function DoomsdayTimer({ onOpen, variant }: DoomsdayTimerProps) {
  const { language } = useLanguage();
  // null hasta montar en cliente: la hora del servidor no coincide con la del
  // visitante y renderizar la cuenta en SSR causaria un hydration mismatch.
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(getRemaining(Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const units = [
    { value: remaining?.days, es: "días", en: "days", wide: true },
    { value: remaining?.hours, es: "hrs", en: "hrs" },
    { value: remaining?.minutes, es: "min", en: "min" },
    { value: remaining?.seconds, es: "seg", en: "sec" },
  ];

  const label =
    remaining?.done
      ? language === "es"
        ? "Ya en cines"
        : "Now in theaters"
      : language === "es"
        ? "Estreno en cines · 18 dic 2026"
        : "In theaters · Dec 18, 2026";

  const wrapper =
    variant === "floating"
      ? "fixed top-4 right-4 z-40 hidden 3xl:block"
      : variant === "header"
        ? "hidden shrink-0 lg:block 3xl:hidden"
        : "lg:hidden";

  return (
    <div className={wrapper}>
      <button
        type="button"
        onClick={onOpen}
        title={
          language === "es"
            ? "Ver la lista Countdown to Doomsday"
            : "Open the Countdown to Doomsday watchlist"
        }
        className={`group relative overflow-hidden rounded-xl border border-emerald-900/60 bg-zinc-950/90 text-left text-zinc-100 shadow-lg shadow-black/30 ring-1 ring-white/5 backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
          variant === "inline" ? "w-full px-3 py-2" : "px-3.5 py-2.5"
        }`}
      >
        {/* Brillo verde tenue, guiño a la armadura de Doom. */}
        <span className="pointer-events-none absolute -top-8 -right-6 h-20 w-20 rounded-full bg-emerald-500/20 blur-2xl transition-opacity group-hover:opacity-100" />

        <div className="relative flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] font-semibold tracking-[0.2em] text-emerald-400 uppercase">
            Avengers: Doomsday
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {label}
          </span>
        </div>

        <div className="relative mt-1.5 flex items-end gap-1.5" aria-live="off">
          {units.map((unit, index) => (
            <div key={unit.en} className="flex items-end gap-1.5">
              {index > 0 && (
                <span className="pb-3 font-mono text-base text-zinc-600">:</span>
              )}
              <div className="flex flex-col items-center">
                <span
                  className={`font-mono text-xl leading-none font-bold tabular-nums ${
                    variant === "inline" ? "" : "lg:text-2xl"
                  }`}
                >
                  {unit.value === undefined
                    ? "--"
                    : unit.wide
                      ? String(unit.value).padStart(2, "0")
                      : pad(unit.value)}
                </span>
                <span className="mt-0.5 text-[9px] tracking-wider text-zinc-500 uppercase">
                  {language === "es" ? unit.es : unit.en}
                </span>
              </div>
            </div>
          ))}
        </div>
      </button>
    </div>
  );
}
