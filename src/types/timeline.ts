export type EntryType = "movie" | "tv" | "one-shot" | "special";

export type TmdbMediaType = "movie" | "tv";

export interface TimelineEntry {
  id: string;
  titleEn: string;
  titleEs: string;
  type: EntryType;
  phase: 1 | 2 | 3 | 4 | 5 | 6;
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
}

export interface Phase {
  number: 1 | 2 | 3 | 4 | 5 | 6;
  nameEn: string;
  nameEs: string;
  subtitleEn: string;
  subtitleEs: string;
}
