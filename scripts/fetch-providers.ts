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

// Regiones pedidas por el usuario: Estados Unidos y Republica Dominicana.
const REGIONS = ["US", "DO"] as const;
type Region = (typeof REGIONS)[number];

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface TmdbWatchProvidersResponse {
  results: Record<
    string,
    {
      link?: string;
      flatrate?: TmdbProvider[];
      ads?: TmdbProvider[];
    }
  >;
}

export interface ProviderCacheEntry {
  name: string;
  logoPath: string | null;
}

export type RegionProviders = Record<Region, ProviderCacheEntry[]>;

// entry.id -> mediaType, necesario para saber si pegarle a /movie/ o /tv/.
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

async function fetchProviders(tmdbId: number, mediaType: "movie" | "tv"): Promise<RegionProviders> {
  const endpoint = mediaType === "movie" ? "movie" : "tv";
  const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/watch/providers`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`, accept: "application/json" },
  });

  const empty: RegionProviders = { US: [], DO: [] };
  if (!response.ok) return empty;

  const data = (await response.json()) as TmdbWatchProvidersResponse;
  const out: RegionProviders = { US: [], DO: [] };
  for (const region of REGIONS) {
    const regionData = data.results[region];
    if (!regionData) continue;
    const providers = [...(regionData.flatrate ?? []), ...(regionData.ads ?? [])];
    const seen = new Set<number>();
    out[region] = providers
      .filter((provider) => {
        if (seen.has(provider.provider_id)) return false;
        seen.add(provider.provider_id);
        return true;
      })
      .map((provider) => ({ name: provider.provider_name, logoPath: provider.logo_path }));
  }
  return out;
}

async function main() {
  const mediaTypes = loadMediaTypes();
  const cache: Record<string, RegionProviders> = {};
  const entries = Object.entries(tmdbCache as Record<string, TmdbCacheEntry>);

  for (const [id, entry] of entries) {
    const mediaType = mediaTypes[id];
    if (!mediaType) continue;
    cache[id] = await fetchProviders(entry.tmdbId, mediaType);
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  const outPath = path.join(__dirname, "..", "src", "data", "providers-cache.json");
  writeFileSync(outPath, JSON.stringify(cache, null, 2) + "\n", "utf-8");
  console.log(`Guardada disponibilidad de streaming para ${Object.keys(cache).length} entradas.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
