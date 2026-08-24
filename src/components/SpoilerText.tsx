"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useSpoilerMode } from "@/lib/spoiler-context";

interface SpoilerTextProps {
  text: string;
  className?: string;
  isSpoiler?: boolean;
}

export function SpoilerText({ text, className, isSpoiler }: SpoilerTextProps) {
  const { language } = useLanguage();
  const { spoilerModeOn } = useSpoilerMode();
  const [revealed, setRevealed] = useState(false);

  if (!isSpoiler || !spoilerModeOn || revealed) {
    return <p className={className}>{text}</p>;
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setRevealed(true);
      }}
      className="relative w-full text-left"
    >
      <p className={`${className ?? ""} select-none blur-sm`}>{text}</p>
      <span className="absolute inset-0 flex items-center justify-center rounded bg-zinc-900/70 px-2 text-center text-xs font-medium text-white">
        {language === "es"
          ? "Contiene spoilers de eventos futuros · click para revelar"
          : "Contains future spoilers · click to reveal"}
      </span>
    </button>
  );
}
