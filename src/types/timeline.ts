export type EntryType = "movie" | "tv" | "one-shot" | "special";

export type TmdbMediaType = "movie" | "tv";

export type PhaseNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimelineEntry {
  id: string;
  titleEn: string;
  titleEs: string;
  type: EntryType;
  phase: PhaseNumber;
  order: number;
  dateLabelEn: string;
  dateLabelEs: string;
  justificationEn: string;
  justificationEs: string;
  tmdbSearchTitle: string;
  tmdbMediaType: TmdbMediaType;
  tmdbYear?: number;
  outsideTime?: boolean;
  earthVariant?: string;
  universeEn?: string;
  universeEs?: string;
  postCreditsEn?: string;
  postCreditsEs?: string;
  triviaEn?: string[];
  triviaEs?: string[];
  hasFutureSpoilers?: boolean;
  /** Part of Disney+'s official "Countdown to Avengers: Doomsday" essential watchlist. */
  inDoomsdayCountdown?: boolean;
}

/** Cómic (o arco de cómics) en el que se inspira una entrega. */
export interface ComicReference {
  /** Título original de la serie o arco, sin traducir (ej. "Civil War"). */
  title: string;
  /** Números concretos, si aplica (ej. "#1-7"). */
  issues?: string;
  /** Año o rango de publicación (ej. "2006-2007"). */
  years?: string;
  /** Guionista(s) y dibujante(s) principales. */
  creators?: string;
  /** Qué toma la entrega de ese cómic. */
  noteEn: string;
  noteEs: string;
  /** Artículo de referencia (Marvel Database u otra fuente verificable). */
  sourceUrl?: string;
}

export interface Phase {
  number: PhaseNumber;
  nameEn: string;
  nameEs: string;
  subtitleEn: string;
  subtitleEs: string;
}
