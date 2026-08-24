"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface SpoilerContextValue {
  spoilerModeOn: boolean;
  toggleSpoilerMode: () => void;
}

const SPOILER_STORAGE_KEY = "mcu-timeline-spoiler-mode";

const SpoilerContext = createContext<SpoilerContextValue | undefined>(undefined);

export function SpoilerProvider({ children }: { children: ReactNode }) {
  const [spoilerModeOn, setSpoilerModeOn] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SPOILER_STORAGE_KEY);
    if (stored === "on") setSpoilerModeOn(true);
  }, []);

  function toggleSpoilerMode() {
    setSpoilerModeOn((prev) => {
      const next = !prev;
      window.localStorage.setItem(SPOILER_STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  }

  return (
    <SpoilerContext.Provider value={{ spoilerModeOn, toggleSpoilerMode }}>
      {children}
    </SpoilerContext.Provider>
  );
}

export function useSpoilerMode() {
  const context = useContext(SpoilerContext);
  if (!context) {
    throw new Error("useSpoilerMode debe usarse dentro de SpoilerProvider");
  }
  return context;
}
