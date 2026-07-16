import ratingsCache from "@/data/ratings-cache.json";

export interface Ratings {
  tmdbScore: number | null;
  imdbRating: string | null;
  rottenTomatoes: string | null;
  imdbId: string | null;
}

const cache = ratingsCache as Record<
  string,
  { tmdbScore: number | null; tmdbVoteCount: number; imdbId: string | null; imdbRating: string | null; rottenTomatoes: string | null }
>;

export function getRatings(id: string): Ratings | null {
  const entry = cache[id];
  if (!entry) return null;
  return {
    tmdbScore: entry.tmdbScore,
    imdbRating: entry.imdbRating,
    rottenTomatoes: entry.rottenTomatoes,
    imdbId: entry.imdbId,
  };
}
