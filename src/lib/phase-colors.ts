export interface PhaseColor {
  accentBg: string;
  accentBorder: string;
  accentText: string;
  badgeBg: string;
  badgeText: string;
}

export const phaseColors: Record<1 | 2 | 3 | 4 | 5 | 6, PhaseColor> = {
  1: {
    accentBg: "bg-red-600",
    accentBorder: "border-red-600",
    accentText: "text-red-600 dark:text-red-400",
    badgeBg: "bg-red-100 dark:bg-red-950",
    badgeText: "text-red-700 dark:text-red-300",
  },
  2: {
    accentBg: "bg-blue-600",
    accentBorder: "border-blue-600",
    accentText: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 dark:bg-blue-950",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
  3: {
    accentBg: "bg-violet-600",
    accentBorder: "border-violet-600",
    accentText: "text-violet-600 dark:text-violet-400",
    badgeBg: "bg-violet-100 dark:bg-violet-950",
    badgeText: "text-violet-700 dark:text-violet-300",
  },
  4: {
    accentBg: "bg-green-600",
    accentBorder: "border-green-600",
    accentText: "text-green-600 dark:text-green-400",
    badgeBg: "bg-green-100 dark:bg-green-950",
    badgeText: "text-green-700 dark:text-green-300",
  },
  5: {
    accentBg: "bg-amber-600",
    accentBorder: "border-amber-600",
    accentText: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-100 dark:bg-amber-950",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  6: {
    accentBg: "bg-stone-700",
    accentBorder: "border-stone-700",
    accentText: "text-stone-700 dark:text-stone-300",
    badgeBg: "bg-stone-200 dark:bg-stone-800",
    badgeText: "text-stone-800 dark:text-stone-200",
  },
};
