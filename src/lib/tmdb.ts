import tmdbCache from "@/data/tmdb-cache.json";
import type { TimelineEntry } from "@/types/timeline";

export type TmdbImageSize = "w342" | "w500" | "w780" | "original";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TmdbCastMember {
  name: string;
  character: string;
  profilePath: string | null;
}

interface TmdbCacheEntry {
  tmdbId: number;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  releaseDate: string | null;
  overviewEn: string | null;
  overviewEs: string | null;
  tagline: string | null;
  runtimeMinutes: number | null;
  genresEn: string[];
  genresEs: string[];
  director: string | null;
  cast: TmdbCastMember[];
  trailerKey: string | null;
}

const cache = tmdbCache as Record<string, TmdbCacheEntry>;

export function getTmdbEntry(id: string): TmdbCacheEntry | undefined {
  return cache[id];
}

export function getPosterUrl(id: string, size: TmdbImageSize = "w500"): string | null {
  const posterPath = cache[id]?.posterPath;
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export function getBackdropUrl(id: string, size: TmdbImageSize = "w780"): string | null {
  const backdropPath = cache[id]?.backdropPath;
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

export function getReleaseYear(id: string): number | null {
  return cache[id]?.releaseYear ?? null;
}

export function getReleaseDate(id: string): string | null {
  return cache[id]?.releaseDate ?? null;
}

export function getOverview(id: string, language: "es" | "en"): string | null {
  const entry = cache[id];
  if (!entry) return null;
  return language === "es" ? entry.overviewEs || entry.overviewEn || null : entry.overviewEn || entry.overviewEs || null;
}

export function getTagline(id: string): string | null {
  return cache[id]?.tagline ?? null;
}

export function getRuntimeLabel(id: string, type: TimelineEntry["type"], language: "es" | "en"): string | null {
  const minutes = cache[id]?.runtimeMinutes;
  if (!minutes) return null;
  if (type === "tv") {
    return language === "es" ? `~${minutes} min por episodio` : `~${minutes} min per episode`;
  }
  return `${minutes} min`;
}

export function getGenres(id: string, language: "es" | "en"): string[] {
  const entry = cache[id];
  if (!entry) return [];
  const primary = language === "es" ? entry.genresEs : entry.genresEn;
  const fallback = language === "es" ? entry.genresEn : entry.genresEs;
  return primary.length > 0 ? primary : fallback;
}

export function getDirector(id: string): string | null {
  return cache[id]?.director ?? null;
}

export function getCast(id: string): TmdbCastMember[] {
  return cache[id]?.cast ?? [];
}

export function getTrailerKey(id: string): string | null {
  return cache[id]?.trailerKey ?? null;
}

export function getProfileUrl(profilePath: string | null): string | null {
  if (!profilePath) return null;
  return `${TMDB_IMAGE_BASE}/w185${profilePath}`;
}
