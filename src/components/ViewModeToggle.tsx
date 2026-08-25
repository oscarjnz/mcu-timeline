"use client";

import { useLanguage } from "@/lib/language-context";

export type ViewMode = "chronological" | "release" | "doomsday";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const labels: Record<ViewMode, { es: string; en: string }> = {
  chronological: { es: "Cronológico", en: "Chronological" },
  release: { es: "Orden de estreno", en: "Release order" },
  doomsday: { es: "Countdown to Doomsday", en: "Countdown to Doomsday" },
};

const order: ViewMode[] = ["chronological", "release", "doomsday"];

export function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  const { language } = useLanguage();

  return (
    <div
      role="tablist"
      aria-label={language === "es" ? "Vista del timeline" : "Timeline view"}
      className="flex flex-wrap gap-2 py-1"
    >
      {order.map((mode) => {
        const active = mode === viewMode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {language === "es" ? labels[mode].es : labels[mode].en}
          </button>
        );
      })}
    </div>
  );
}
