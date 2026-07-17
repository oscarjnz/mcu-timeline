import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { timeline } from "../src/data/timeline";
import type { TimelineEntry } from "../src/types/timeline";

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

interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

interface TmdbSearchResponse {
  results: TmdbSearchResult[];
}

export interface TmdbCacheEntry {
  tmdbId: number;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
}

interface TmdbSeasonResponse {
  air_date: string | null;
}

// La mayoria de nuestras entradas de TV son un tramo de episodios de una
// temporada especifica (ej. "Agents of S.H.I.E.L.D. Season 3, Episodes 1-10"),
// pero el resultado de busqueda de TMDB solo trae la fecha de estreno de la
// serie completa (temporada 1). Para no mostrar "estreno 2013" en una entrada
// de la temporada 6, se resuelve el numero de temporada desde el titulo y se
// pide la fecha de estreno de esa temporada puntual.
async function fetchSeasonAirYear(tmdbId: number, entry: TimelineEntry): Promise<number | null> {
  const seasonMatch = entry.titleEn.match(/Season (\d+)/);
  const seasonNumber = seasonMatch ? Number(seasonMatch[1]) : 1;

  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`,
    {
      headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`, accept: "application/json" },
    },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as TmdbSeasonResponse;
  if (!data.air_date) return null;
  return Number(data.air_date.slice(0, 4));
}

async function searchTmdb(entry: TimelineEntry): Promise<TmdbSearchResult | null> {
  const endpoint = entry.tmdbMediaType === "movie" ? "search/movie" : "search/tv";
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  url.searchParams.set("query", entry.tmdbSearchTitle);
  url.searchParams.set("include_adult", "false");
  if (entry.tmdbYear && entry.tmdbMediaType === "movie") {
    url.searchParams.set("year", String(entry.tmdbYear));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    console.warn(`TMDB respondio ${response.status} para "${entry.tmdbSearchTitle}" (${entry.id})`);
    return null;
  }

  const data = (await response.json()) as TmdbSearchResponse;
  if (data.results.length === 0) return null;

  if (entry.tmdbYear) {
    const wanted = String(entry.tmdbYear);
    const yearMatch = data.results.find((result) =>
      result.release_date?.startsWith(wanted) || result.first_air_date?.startsWith(wanted),
    );
    if (yearMatch) return yearMatch;
  }

  // La API ordena por popularidad, no por coincidencia de titulo: un resultado mas
  // popular pero con nombre distinto (ej. una serie posterior del mismo universo)
  // puede aparecer antes que la entrada exacta que buscamos.
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wantedTitle = normalize(entry.tmdbSearchTitle);
  const exactMatch = data.results.find(
    (result) => normalize(result.title ?? result.name ?? "") === wantedTitle,
  );
  if (exactMatch) return exactMatch;

  return data.results[0];
}

async function main() {
  const cache: Record<string, TmdbCacheEntry> = {};
  const misses: string[] = [];

  for (const entry of timeline) {
    const result = await searchTmdb(entry);
    if (!result) {
      misses.push(`${entry.id} (${entry.tmdbSearchTitle})`);
      continue;
    }
    let releaseYear: number | null = null;
    if (entry.tmdbMediaType === "tv") {
      releaseYear = await fetchSeasonAirYear(result.id, entry);
    } else if (result.release_date) {
      releaseYear = Number(result.release_date.slice(0, 4));
    }

    cache[entry.id] = {
      tmdbId: result.id,
      posterPath: result.poster_path,
      backdropPath: result.backdrop_path,
      releaseYear,
    };
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  const outPath = path.join(__dirname, "..", "src", "data", "tmdb-cache.json");
  writeFileSync(outPath, JSON.stringify(cache, null, 2) + "\n", "utf-8");

  console.log(`Resueltas ${Object.keys(cache).length} de ${timeline.length} entradas.`);
  if (misses.length > 0) {
    console.log("Sin match en TMDB:");
    for (const miss of misses) console.log(`  - ${miss}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
