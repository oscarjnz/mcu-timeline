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

export interface Phase {
  number: PhaseNumber;
  nameEn: string;
  nameEs: string;
  subtitleEn: string;
  subtitleEs: string;
}
