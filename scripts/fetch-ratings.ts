import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import tmdbCache from "../src/data/tmdb-cache.json";
import type { TmdbCacheEntry } from "./fetch-tmdb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
if (!TMDB_READ_ACCESS_TOKEN) {
  throw new Error("Falta TMDB_READ_ACCESS_TOKEN en el entorno (revisa .env.local).");
}

// Opcional: si no esta seteada, simplemente se omiten imdbRating/rottenTomatoes
// y solo se guarda el rating propio de TMDB (no requiere key adicional).
const OMDB_API_KEY = process.env.OMDB_API_KEY;

export interface RatingsCacheEntry {
  tmdbScore: number | null;
  tmdbVoteCount: number;
  imdbId: string | null;
  imdbRating: string | null;
  rottenTomatoes: string | null;
}

function loadMediaTypes(): Record<string, "movie" | "tv"> {
  const src = readFileSync(path.join(__dirname, "..", "src", "data", "timeline.ts"), "utf-8");
  const blocks = src.split(/\{\s*\n\s*id:/).slice(1);
  const map: Record<string, "movie" | "tv"> = {};
  for (const block of blocks) {
    const id = block.match(/^\s*"([^"]+)"/)?.[1];
    const mediaType = block.match(/tmdbMediaType:\s*"([^"]+)"/)?.[1] as "movie" | "tv" | undefined;
    if (id && mediaType) map[id] = mediaType;
  }
  return map;
}

async function fetchTmdbDetails(tmdbId: number, mediaType: "movie" | "tv") {
  const endpoint = mediaType === "movie" ? "movie" : "tv";
  const response = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}`, {
    headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`, accept: "application/json" },
  });
  if (!response.ok) return null;
  return (await response.json()) as { vote_average: number; vote_count: number };
}

async function fetchImdbId(tmdbId: number, mediaType: "movie" | "tv"): Promise<string | null> {
  const endpoint = mediaType === "movie" ? "movie" : "tv";
  const response = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/external_ids`, {
    headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`, accept: "application/json" },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { imdb_id: string | null };
  return data.imdb_id ?? null;
}

async function fetchOmdbRatings(
  imdbId: string,
): Promise<{ imdbRating: string | null; rottenTomatoes: string | null }> {
  if (!OMDB_API_KEY) return { imdbRating: null, rottenTomatoes: null };

  const response = await fetch(
    `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`,
  );
  if (!response.ok) return { imdbRating: null, rottenTomatoes: null };

  const data = (await response.json()) as {
    Response: string;
    imdbRating?: string;
    Ratings?: { Source: string; Value: string }[];
  };
  if (data.Response !== "True") return { imdbRating: null, rottenTomatoes: null };

  const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value ?? null;
  const imdbRating = data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null;
  return { imdbRating, rottenTomatoes: rt };
}

async function main() {
  const mediaTypes = loadMediaTypes();
  const cache: Record<string, RatingsCacheEntry> = {};
  const entries = Object.entries(tmdbCache as Record<string, TmdbCacheEntry>);

  if (!OMDB_API_KEY) {
    console.log(
      "OMDB_API_KEY no esta seteada: se guardara solo el rating de TMDB. " +
        "Agrega OMDB_API_KEY a .env.local y vuelve a correr este script para sumar IMDb y Rotten Tomatoes.",
    );
  }

  for (const [id, entry] of entries) {
    const mediaType = mediaTypes[id];
    if (!mediaType) continue;

    const details = await fetchTmdbDetails(entry.tmdbId, mediaType);
    const imdbId = await fetchImdbId(entry.tmdbId, mediaType);
    const omdb = imdbId ? await fetchOmdbRatings(imdbId) : { imdbRating: null, rottenTomatoes: null };

    cache[id] = {
      tmdbScore: details?.vote_average ?? null,
      tmdbVoteCount: details?.vote_count ?? 0,
      imdbId,
      imdbRating: omdb.imdbRating,
      rottenTomatoes: omdb.rottenTomatoes,
    };
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  const outPath = path.join(__dirname, "..", "src", "data", "ratings-cache.json");
  writeFileSync(outPath, JSON.stringify(cache, null, 2) + "\n", "utf-8");
  console.log(`Guardadas puntuaciones para ${Object.keys(cache).length} entradas.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
