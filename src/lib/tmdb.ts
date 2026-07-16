import tmdbCache from "@/data/tmdb-cache.json";

export type TmdbImageSize = "w342" | "w500" | "w780" | "original";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TmdbCacheEntry {
  tmdbId: number;
  posterPath: string | null;
  backdropPath: string | null;
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
