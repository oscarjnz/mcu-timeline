# Vista de detalle por entrega + enriquecimiento de contenido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada tarjeta del timeline se vuelve clickeable y abre un modal de detalle con sinopsis, ficha técnica, trailer, universo/variante, curiosidades y (cuando aplica) escena post-créditos; más un modo global "sin spoilers" opcional.

**Architecture:** Todo el enriquecimiento automático (sinopsis, elenco, director, duración, género, trailer) sale de una extensión del script `fetch-tmdb.ts` existente hacia `tmdb-cache.json`, leído en build/runtime por getters nuevos en `lib/tmdb.ts`. El modal es un componente cliente montado en `TimelineApp`, cuyo estado se sincroniza con `?entry=<id>` en la URL vía History API nativa (sin `next/navigation`, para no requerir un boundary de Suspense en esta página 100% estática). El modo sin spoilers es un contexto React nuevo (mismo patrón que `language-context.tsx`) con persistencia en `localStorage`, y un componente `SpoilerText` compartido entre la tarjeta de la lista y el modal.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4. Sin frameworks de testing (proyecto de contenido/UI, verificación manual en navegador — ver `CLAUDE.md`).

## Global Constraints

- Sin suite de tests automatizados en este repo: cada tarea reemplaza "escribir test / correr test" por "correr `npm run build`" + verificación manual en navegador (Chrome, desktop y 390x844 mobile), siguiendo la convención ya documentada en `CLAUDE.md`.
- Título de cada entrega (`titleEs`) siempre en inglés original, igual a `titleEn` — no tocar ese campo en las tareas de curación de contenido.
- Nunca usar guion largo/medio (—/–) en ningún texto nuevo (ES o EN), por regla global del usuario. Usar coma, punto y coma o punto y seguido.
- Nunca usar Title Case indebido en español.
- Todo texto nuevo en `src/data/timeline.ts` respeta el patrón bilingüe ES/EN ya existente (dos campos, `...En`/`...Es`, nunca uno solo).
- Ambigüedades resueltas respecto a la spec original (`docs/superpowers/specs/2026-08-24-entry-detail-view-design.md`), documentadas aquí porque el spec las dejaba abiertas:
  - `tagline` es un solo campo (sin versión ES): TMDB casi no traduce taglines y son eslóganes de marketing, se muestran tal cual sin importar el idioma activo.
  - `trailerKey` prioriza el trailer oficial en inglés más reciente; no se agrega una tercera request para buscar trailers en español porque la cobertura real en TMDB es mínima para este catálogo.
  - `genres` sí se guarda en dos listas (`genresEn`/`genresEs`) porque TMDB los devuelve localizados sin costo adicional de request (ya se hace una llamada es-ES para el overview).
- Adaptación al proceso de `writing-plans`: las Tareas 9 a 14 son de curación de contenido, no de código. No tiene sentido pre-escribir las 114 entradas dentro de este plan (sería escribir el trabajo dos veces); cada una de esas tareas da la forma exacta de los campos, un ejemplo completo ya resuelto, la lista exhaustiva de ids a cubrir y el criterio de verificación. El contenido real se escribe directo en `src/data/timeline.ts` al ejecutar la tarea.

---

### Task 1: Extender el modelo de datos (`TimelineEntry`)

**Files:**
- Modify: `src/types/timeline.ts`

**Interfaces:**
- Produces: `TimelineEntry` con los campos opcionales `universeEn`, `universeEs`, `postCreditsEn`, `postCreditsEs`, `triviaEn: string[]`, `triviaEs: string[]`, `hasFutureSpoilers: boolean`. Todas las tareas siguientes (2 a 14) dependen de estos nombres exactos.

- [ ] **Step 1: Agregar los campos nuevos a la interfaz**

Reemplazar el archivo completo por:

```ts
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
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, sin errores de TypeScript (los campos son opcionales, ninguna entrada existente se rompe).

- [ ] **Step 3: Commit**

```bash
git add src/types/timeline.ts
git commit -m "Agregar campos opcionales de universo, curiosidades y post-creditos al tipo TimelineEntry"
```

---

### Task 2: Extender `fetch-tmdb.ts` y regenerar `tmdb-cache.json`

**Files:**
- Modify: `scripts/fetch-tmdb.ts`
- Modify (generado por el script, no a mano): `src/data/tmdb-cache.json`

**Interfaces:**
- Consumes: `TimelineEntry` (Task 1, sin cambios relevantes para esta tarea).
- Produces: cada entrada de `src/data/tmdb-cache.json` (tipada como `TmdbCacheEntry`) gana `overviewEn: string | null`, `overviewEs: string | null`, `tagline: string | null`, `runtimeMinutes: number | null`, `genresEn: string[]`, `genresEs: string[]`, `director: string | null`, `cast: { name: string; character: string; profilePath: string | null }[]`, `trailerKey: string | null`. La Tarea 3 consume exactamente esta forma.

- [ ] **Step 1: Reemplazar `scripts/fetch-tmdb.ts` completo**

```ts
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

function tmdbHeaders() {
  return { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`, accept: "application/json" };
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

export interface TmdbCastMember {
  name: string;
  character: string;
  profilePath: string | null;
}

export interface TmdbCacheEntry {
  tmdbId: number;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
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

interface TmdbSeasonResponse {
  air_date: string | null;
  overview: string | null;
}

interface TmdbCreditsResponse {
  cast: { name: string; character: string; profile_path: string | null; order: number }[];
  crew: { job: string; name: string }[];
}

interface TmdbVideosResponse {
  results: { key: string; site: string; type: string; official: boolean; published_at: string }[];
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbDetailsResponse {
  overview: string | null;
  tagline?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  genres: TmdbGenre[];
  created_by?: { name: string }[];
  credits: TmdbCreditsResponse;
  videos: TmdbVideosResponse;
}

interface TmdbLocalizedDetailsResponse {
  overview: string | null;
  genres: TmdbGenre[];
}

function getSeasonNumber(entry: TimelineEntry): number {
  const seasonMatch = entry.titleEn.match(/Season (\d+)/);
  return seasonMatch ? Number(seasonMatch[1]) : 1;
}

// La mayoria de nuestras entradas de TV son un tramo de episodios de una
// temporada especifica (ej. "Agents of S.H.I.E.L.D. Season 3, Episodes 1-10"),
// pero el resultado de busqueda de TMDB solo trae la fecha de estreno de la
// serie completa (temporada 1). Para no mostrar "estreno 2013" en una entrada
// de la temporada 6, se resuelve el numero de temporada desde el titulo y se
// pide la fecha de estreno de esa temporada puntual.
async function fetchSeasonAirYear(tmdbId: number, entry: TimelineEntry): Promise<number | null> {
  const seasonNumber = getSeasonNumber(entry);
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`,
    { headers: tmdbHeaders() },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as TmdbSeasonResponse;
  if (!data.air_date) return null;
  return Number(data.air_date.slice(0, 4));
}

// Mismo problema que arriba pero para la sinopsis: el endpoint de serie
// completa devuelve el overview de la temporada 1, no el de la temporada
// especifica de esta entrada. Se pide el overview de la temporada exacta.
async function fetchSeasonOverview(tmdbId: number, entry: TimelineEntry, language: string): Promise<string | null> {
  const seasonNumber = getSeasonNumber(entry);
  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`);
  url.searchParams.set("language", language);
  const response = await fetch(url, { headers: tmdbHeaders() });
  if (!response.ok) return null;
  const data = (await response.json()) as TmdbSeasonResponse;
  return data.overview || null;
}

async function searchTmdb(entry: TimelineEntry): Promise<TmdbSearchResult | null> {
  const endpoint = entry.tmdbMediaType === "movie" ? "search/movie" : "search/tv";
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  url.searchParams.set("query", entry.tmdbSearchTitle);
  url.searchParams.set("include_adult", "false");
  if (entry.tmdbYear && entry.tmdbMediaType === "movie") {
    url.searchParams.set("year", String(entry.tmdbYear));
  }

  const response = await fetch(url, { headers: tmdbHeaders() });

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

async function fetchDetails(entry: TimelineEntry, tmdbId: number): Promise<Omit<TmdbCacheEntry, "tmdbId" | "posterPath" | "backdropPath" | "releaseYear">> {
  const endpoint = entry.tmdbMediaType === "movie" ? "movie" : "tv";

  const mainUrl = new URL(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}`);
  mainUrl.searchParams.set("language", "en-US");
  mainUrl.searchParams.set("append_to_response", "credits,videos");
  const mainResponse = await fetch(mainUrl, { headers: tmdbHeaders() });
  const main = mainResponse.ok ? ((await mainResponse.json()) as TmdbDetailsResponse) : null;

  const esUrl = new URL(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}`);
  esUrl.searchParams.set("language", "es-ES");
  const esResponse = await fetch(esUrl, { headers: tmdbHeaders() });
  const es = esResponse.ok ? ((await esResponse.json()) as TmdbLocalizedDetailsResponse) : null;

  const isSplitSeason = entry.tmdbMediaType === "tv" && /Season \d+/.test(entry.titleEn);
  const overviewEn = isSplitSeason
    ? await fetchSeasonOverview(tmdbId, entry, "en-US")
    : main?.overview || null;
  const overviewEs = isSplitSeason
    ? await fetchSeasonOverview(tmdbId, entry, "es-ES")
    : es?.overview || null;

  const runtimeMinutes =
    entry.tmdbMediaType === "movie"
      ? main?.runtime ?? null
      : main?.episode_run_time?.[0] ?? null;

  const director =
    entry.tmdbMediaType === "movie"
      ? main?.credits.crew.find((c) => c.job === "Director")?.name ?? null
      : main?.created_by && main.created_by.length > 0
        ? main.created_by.map((c) => c.name).join(", ")
        : null;

  const cast: TmdbCastMember[] = (main?.credits.cast ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map((c) => ({ name: c.name, character: c.character, profilePath: c.profile_path }));

  const trailers = (main?.videos.results ?? []).filter(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );
  const officialTrailers = trailers.filter((v) => v.official);
  const bestTrailers = officialTrailers.length > 0 ? officialTrailers : trailers;
  bestTrailers.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const trailerKey = bestTrailers[0]?.key ?? null;

  return {
    overviewEn,
    overviewEs,
    tagline: main?.tagline || null,
    runtimeMinutes,
    genresEn: main?.genres.map((g) => g.name) ?? [],
    genresEs: es?.genres.map((g) => g.name) ?? [],
    director,
    cast,
    trailerKey,
  };
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

    const details = await fetchDetails(entry, result.id);

    cache[entry.id] = {
      tmdbId: result.id,
      posterPath: result.poster_path,
      backdropPath: result.backdrop_path,
      releaseYear,
      ...details,
    };
    await new Promise((resolve) => setTimeout(resolve, 80));
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
```

- [ ] **Step 2: Correr el script contra la API real de TMDB**

Run: `npm run tmdb:fetch`
Expected: termina con `Resueltas 114 de 114 entradas.` (o el número de entradas vigente); revisar la lista de "Sin match en TMDB" si aparece alguna y confirmar que son solo Avengers: Doomsday / Secret Wars (no estrenadas) u otras entradas ya conocidas por no tener match limpio.

- [ ] **Step 3: Revisar rápido el JSON generado**

Abrir `src/data/tmdb-cache.json` y confirmar que una entrada cualquiera (ej. `iron-man`) tiene `overviewEn`, `overviewEs`, `cast` con nombres reales, y `trailerKey` no nulo.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-tmdb.ts src/data/tmdb-cache.json
git commit -m "Ampliar fetch-tmdb.ts para traer sinopsis, ficha tecnica y trailer de TMDB"
```

---

### Task 3: Nuevos getters en `src/lib/tmdb.ts`

**Files:**
- Modify: `src/lib/tmdb.ts`

**Interfaces:**
- Consumes: la forma de `src/data/tmdb-cache.json` producida en la Tarea 2.
- Produces: `getOverview(id: string, language: "es" | "en"): string | null`, `getTagline(id: string): string | null`, `getRuntimeLabel(id: string, type: TimelineEntry["type"], language: "es" | "en"): string | null`, `getGenres(id: string, language: "es" | "en"): string[]`, `getDirector(id: string): string | null`, `getCast(id: string): TmdbCastMember[]`, `getTrailerKey(id: string): string | null`, `getProfileUrl(profilePath: string | null): string | null`, y el tipo exportado `TmdbCastMember`. La Tarea 7 (`EntryDetailModal`) importa todos estos nombres tal cual.

- [ ] **Step 1: Reemplazar `src/lib/tmdb.ts` completo**

```ts
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
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tmdb.ts
git commit -m "Agregar getters de sinopsis, ficha tecnica y trailer a lib/tmdb"
```

---

### Task 4: Componente compartido `RatingsAndProviders.tsx`

Extrae el bloque de ratings y streaming que hoy vive solo en `TimelineEntryCard` a un componente compartido, para que el modal de detalle (Tarea 7) lo reuse sin duplicar JSX.

**Files:**
- Create: `src/components/RatingsAndProviders.tsx`
- Modify: `src/components/TimelineEntryCard.tsx`

**Interfaces:**
- Consumes: `Ratings` (de `@/lib/ratings`), `Provider` (de `@/lib/providers`, hoy no exportado, ver Step 1).
- Produces: `RatingsRow({ ratings: Ratings | null })`, `WatchProviderRow({ label: string; providers: Provider[] })`, `ProvidersBlock({ providers: { us: Provider[]; do: Provider[]; sameInBothRegions: boolean }; sameLabel: string })`. La Tarea 7 (`EntryDetailModal`) y la Tarea 8 (`TimelineEntryCard` final) importan estos tres nombres desde `@/components/RatingsAndProviders`.

- [ ] **Step 1: Exportar el tipo `Provider` desde `src/lib/providers.ts`**

El tipo ya existe pero no se usaba fuera del archivo. Confirmar que la línea es:

```ts
export interface Provider {
  name: string;
  logoUrl: string | null;
}
```

(Ya está exportado en el archivo actual, no requiere cambio; solo confirmarlo antes de importar `Provider` en el nuevo componente.)

- [ ] **Step 2: Crear `src/components/RatingsAndProviders.tsx`**

```tsx
import Image from "next/image";
import type { Ratings } from "@/lib/ratings";
import type { Provider } from "@/lib/providers";

export function RatingsRow({ ratings }: { ratings: Ratings | null }) {
  if (!ratings || (!ratings.imdbRating && !ratings.rottenTomatoes && ratings.tmdbScore === null)) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
      {ratings.imdbRating && (
        <span>
          <span className="font-semibold text-amber-500">IMDb</span> {ratings.imdbRating}/10
        </span>
      )}
      {ratings.rottenTomatoes && (
        <span>
          <span className="font-semibold text-red-500">RT</span> {ratings.rottenTomatoes}
        </span>
      )}
      {ratings.tmdbScore !== null && (
        <span>
          <span className="font-semibold text-sky-500">TMDB</span> {ratings.tmdbScore.toFixed(1)}/10
        </span>
      )}
    </div>
  );
}

export function WatchProviderRow({ label, providers }: { label: string; providers: Provider[] }) {
  if (providers.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-medium text-zinc-500 dark:text-zinc-500">{label}:</span>
      {providers.map((provider) => (
        <span
          key={provider.name}
          className="flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 dark:bg-zinc-800"
        >
          {provider.logoUrl && (
            <Image src={provider.logoUrl} alt="" width={14} height={14} className="rounded-sm" />
          )}
          {provider.name}
        </span>
      ))}
    </div>
  );
}

export function ProvidersBlock({
  providers,
  sameLabel,
}: {
  providers: { us: Provider[]; do: Provider[]; sameInBothRegions: boolean };
  sameLabel: string;
}) {
  if (providers.us.length === 0 && providers.do.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
      <WatchProviderRow label={providers.sameInBothRegions ? sameLabel : "US"} providers={providers.us} />
      {!providers.sameInBothRegions && <WatchProviderRow label="DO" providers={providers.do} />}
    </div>
  );
}
```

- [ ] **Step 3: Usar el componente nuevo en `TimelineEntryCard.tsx`**

Reemplazar el archivo completo por:

```tsx
"use client";

import Image from "next/image";
import type { TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";
import { getPosterUrl, getReleaseYear } from "@/lib/tmdb";
import { getRatings } from "@/lib/ratings";
import { getProviders } from "@/lib/providers";
import { RatingsRow, ProvidersBlock } from "@/components/RatingsAndProviders";

const typeLabels: Record<TimelineEntry["type"], { es: string; en: string }> = {
  movie: { es: "Película", en: "Movie" },
  tv: { es: "Serie", en: "TV show" },
  "one-shot": { es: "One-shot", en: "One-shot" },
  special: { es: "Especial", en: "Special" },
};

export function TimelineEntryCard({ entry }: { entry: TimelineEntry }) {
  const { language } = useLanguage();
  const colors = phaseColors[entry.phase];
  const posterUrl = getPosterUrl(entry.id, "w342");
  const releaseYear = getReleaseYear(entry.id);
  const ratings = getRatings(entry.id);
  const providers = getProviders(entry.id);

  const title = language === "es" ? entry.titleEs : entry.titleEn;
  const dateLabel = language === "es" ? entry.dateLabelEs : entry.dateLabelEn;
  const justification = language === "es" ? entry.justificationEs : entry.justificationEn;

  return (
    <article
      className={`flex gap-4 rounded-lg border-l-4 bg-zinc-50 p-4 transition-shadow duration-200 hover:shadow-md dark:bg-zinc-900 ${colors.accentBorder}`}
    >
      <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-zinc-500 dark:text-zinc-400">
            {title}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}
          >
            {language === "es" ? typeLabels[entry.type].es : typeLabels[entry.type].en}
          </span>
          {entry.outsideTime && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {language === "es" ? "Fuera del tiempo" : "Outside of time"}
            </span>
          )}
          {entry.earthVariant && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {entry.earthVariant}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dateLabel}
          {releaseYear !== null && (
            <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
              ({language === "es" ? "estreno" : "release"}: {releaseYear})
            </span>
          )}
        </p>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{justification}</p>

        <RatingsRow ratings={ratings} />
        <ProvidersBlock providers={providers} sameLabel={language === "es" ? "Disponible en" : "Available on"} />
      </div>
    </article>
  );
}
```

(Esta versión todavía no tiene click-to-open ni spoiler wiring: eso llega en las Tareas 6 y 8. Este paso solo elimina la duplicación de ratings/providers.)

- [ ] **Step 4: Verificar en navegador**

Run: `npm run dev`, abrir `http://localhost:3000`. Confirmar que las tarjetas se ven exactamente igual que antes (ratings y streaming en el mismo lugar).

- [ ] **Step 5: Commit**

```bash
git add src/components/RatingsAndProviders.tsx src/components/TimelineEntryCard.tsx
git commit -m "Extraer RatingsRow y ProvidersBlock a un componente compartido"
```

---

### Task 5: Contexto y toggle de modo sin spoilers

**Files:**
- Create: `src/lib/spoiler-context.tsx`
- Create: `src/components/SpoilerToggle.tsx`

**Interfaces:**
- Consumes: `useLanguage` de `@/lib/language-context` (Task 6/8 lo usan igual).
- Produces: `SpoilerProvider({ children })`, `useSpoilerMode(): { spoilerModeOn: boolean; toggleSpoilerMode: () => void }` desde `@/lib/spoiler-context`; componente `SpoilerToggle` desde `@/components/SpoilerToggle`. La Tarea 6 (`SpoilerText`) y la Tarea 8 (`TimelineApp`) consumen estos nombres.

- [ ] **Step 1: Crear `src/lib/spoiler-context.tsx`**

```tsx
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
```

- [ ] **Step 2: Crear `src/components/SpoilerToggle.tsx`**

```tsx
"use client";

import { useSpoilerMode } from "@/lib/spoiler-context";
import { useLanguage } from "@/lib/language-context";

export function SpoilerToggle() {
  const { spoilerModeOn, toggleSpoilerMode } = useSpoilerMode();
  const { language } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleSpoilerMode}
      aria-pressed={spoilerModeOn}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        spoilerModeOn
          ? "border-amber-500 bg-amber-100 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-300"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }`}
      aria-label={
        language === "es"
          ? spoilerModeOn
            ? "Desactivar modo sin spoilers"
            : "Activar modo sin spoilers"
          : spoilerModeOn
            ? "Turn off spoiler-safe mode"
            : "Turn on spoiler-safe mode"
      }
    >
      {language === "es" ? "Sin spoilers" : "Spoiler-safe"}
    </button>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso (el toggle todavía no está montado en ningún lado, eso pasa en la Tarea 8; este paso solo confirma que el archivo es válido TypeScript/JSX).

- [ ] **Step 4: Commit**

```bash
git add src/lib/spoiler-context.tsx src/components/SpoilerToggle.tsx
git commit -m "Agregar contexto y toggle de modo sin spoilers"
```

---

### Task 6: Componente `SpoilerText`

**Files:**
- Create: `src/components/SpoilerText.tsx`

**Interfaces:**
- Consumes: `useLanguage` (`@/lib/language-context`), `useSpoilerMode` (`@/lib/spoiler-context`, Task 5).
- Produces: `SpoilerText({ text: string; className?: string; isSpoiler?: boolean })`. La Tarea 7 (`EntryDetailModal`) y la Tarea 8 (`TimelineEntryCard` final) lo importan desde `@/components/SpoilerText`.

- [ ] **Step 1: Crear `src/components/SpoilerText.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useSpoilerMode } from "@/lib/spoiler-context";

interface SpoilerTextProps {
  text: string;
  className?: string;
  isSpoiler?: boolean;
}

export function SpoilerText({ text, className, isSpoiler }: SpoilerTextProps) {
  const { language } = useLanguage();
  const { spoilerModeOn } = useSpoilerMode();
  const [revealed, setRevealed] = useState(false);

  if (!isSpoiler || !spoilerModeOn || revealed) {
    return <p className={className}>{text}</p>;
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setRevealed(true);
      }}
      className="relative w-full text-left"
    >
      <p className={`${className ?? ""} select-none blur-sm`}>{text}</p>
      <span className="absolute inset-0 flex items-center justify-center rounded bg-zinc-900/70 px-2 text-center text-xs font-medium text-white">
        {language === "es"
          ? "Contiene spoilers de eventos futuros · click para revelar"
          : "Contains future spoilers · click to reveal"}
      </span>
    </button>
  );
}
```

Nota: `event.stopPropagation()` es necesario porque este componente se usa dentro de `TimelineEntryCard`, que en la Tarea 8 se vuelve clickeable como un todo; sin esto, revelar el spoiler también abriría el modal de detalle.

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/components/SpoilerText.tsx
git commit -m "Agregar componente SpoilerText para difuminar justificaciones con spoiler"
```

---

### Task 7: `EntryDetailModal` + habilitar dominio de thumbnails de YouTube

**Files:**
- Modify: `next.config.ts`
- Create: `src/components/EntryDetailModal.tsx`

**Interfaces:**
- Consumes: `TimelineEntry` (Task 1); `getPosterUrl`, `getBackdropUrl`, `getReleaseYear`, `getOverview`, `getTagline`, `getRuntimeLabel`, `getGenres`, `getDirector`, `getCast`, `getTrailerKey`, `getProfileUrl` (Task 3); `RatingsRow`, `ProvidersBlock` (Task 4); `SpoilerText` (Task 6); `getRatings` (`@/lib/ratings`), `getProviders` (`@/lib/providers`), `phaseColors` (`@/lib/phase-colors`), `useLanguage` (`@/lib/language-context`).
- Produces: `EntryDetailModal({ entry: TimelineEntry; onClose: () => void })` desde `@/components/EntryDetailModal`. La Tarea 8 (`TimelineApp`) lo monta.

- [ ] **Step 1: Agregar `img.youtube.com` a los dominios de imagen permitidos**

Modificar `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Crear `src/components/EntryDetailModal.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";
import {
  getPosterUrl,
  getBackdropUrl,
  getReleaseYear,
  getOverview,
  getTagline,
  getRuntimeLabel,
  getGenres,
  getDirector,
  getCast,
  getTrailerKey,
  getProfileUrl,
} from "@/lib/tmdb";
import { getRatings } from "@/lib/ratings";
import { getProviders } from "@/lib/providers";
import { RatingsRow, ProvidersBlock } from "@/components/RatingsAndProviders";
import { SpoilerText } from "@/components/SpoilerText";

const typeLabels: Record<TimelineEntry["type"], { es: string; en: string }> = {
  movie: { es: "Película", en: "Movie" },
  tv: { es: "Serie", en: "TV show" },
  "one-shot": { es: "One-shot", en: "One-shot" },
  special: { es: "Especial", en: "Special" },
};

interface EntryDetailModalProps {
  entry: TimelineEntry;
  onClose: () => void;
}

export function EntryDetailModal({ entry, onClose }: EntryDetailModalProps) {
  const { language } = useLanguage();
  const [trailerLoaded, setTrailerLoaded] = useState(false);
  const [postCreditsRevealed, setPostCreditsRevealed] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const colors = phaseColors[entry.phase];
  const title = language === "es" ? entry.titleEs : entry.titleEn;
  const dateLabel = language === "es" ? entry.dateLabelEs : entry.dateLabelEn;
  const justification = language === "es" ? entry.justificationEs : entry.justificationEn;
  const releaseYear = getReleaseYear(entry.id);
  const posterUrl = getPosterUrl(entry.id, "w342");
  const backdropUrl = getBackdropUrl(entry.id, "w780");
  const overview = getOverview(entry.id, language);
  const tagline = getTagline(entry.id);
  const runtimeLabel = getRuntimeLabel(entry.id, entry.type, language);
  const genres = getGenres(entry.id, language);
  const director = getDirector(entry.id);
  const cast = getCast(entry.id);
  const trailerKey = getTrailerKey(entry.id);
  const ratings = getRatings(entry.id);
  const providers = getProviders(entry.id);

  const universe =
    language === "es"
      ? entry.universeEs ?? "Earth-616 (universo principal del UCM)"
      : entry.universeEn ?? "Earth-616 (main MCU universe)";

  const trivia = language === "es" ? entry.triviaEs : entry.triviaEn;
  const postCredits = language === "es" ? entry.postCreditsEs : entry.postCreditsEn;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={language === "es" ? "Cerrar" : "Close"}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70"
        >
          ×
        </button>

        {backdropUrl && (
          <div className="relative h-40 w-full overflow-hidden rounded-t-lg sm:h-56">
            <Image src={backdropUrl} alt="" fill sizes="672px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950" />
          </div>
        )}

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="relative h-44 w-28 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              {posterUrl ? (
                <Image src={posterUrl} alt={title} fill sizes="112px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-zinc-500 dark:text-zinc-400">
                  {title}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}>
                  {language === "es" ? typeLabels[entry.type].es : typeLabels[entry.type].en}
                </span>
              </div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {dateLabel}
                {releaseYear !== null && (
                  <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
                    ({language === "es" ? "estreno" : "release"}: {releaseYear})
                  </span>
                )}
              </p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{universe}</p>
              {tagline && (
                <p className="text-sm italic text-zinc-500 dark:text-zinc-400">&ldquo;{tagline}&rdquo;</p>
              )}
            </div>
          </div>

          {overview && (
            <section>
              <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {language === "es" ? "Sinopsis" : "Synopsis"}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{overview}</p>
            </section>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {language === "es" ? "Por qué va aquí" : "Why it's placed here"}
            </h3>
            <SpoilerText
              text={justification}
              isSpoiler={entry.hasFutureSpoilers}
              className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            />
          </section>

          {(director || runtimeLabel || genres.length > 0) && (
            <section className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {director && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {entry.type === "tv"
                      ? language === "es"
                        ? "Creador"
                        : "Creator"
                      : language === "es"
                        ? "Director"
                        : "Director"}
                  </p>
                  <p className="text-zinc-800 dark:text-zinc-200">{director}</p>
                </div>
              )}
              {runtimeLabel && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {language === "es" ? "Duración" : "Runtime"}
                  </p>
                  <p className="text-zinc-800 dark:text-zinc-200">{runtimeLabel}</p>
                </div>
              )}
              {genres.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {language === "es" ? "Género" : "Genre"}
                  </p>
                  <p className="text-zinc-800 dark:text-zinc-200">{genres.join(", ")}</p>
                </div>
              )}
            </section>
          )}

          {cast.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {language === "es" ? "Elenco principal" : "Main cast"}
              </h3>
              <div className="flex flex-wrap gap-3">
                {cast.map((member) => {
                  const profileUrl = getProfileUrl(member.profilePath);
                  return (
                    <div key={member.name} className="flex w-16 flex-col items-center gap-1 text-center">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        {profileUrl && (
                          <Image src={profileUrl} alt={member.name} fill sizes="64px" className="object-cover" />
                        )}
                      </div>
                      <p className="text-[11px] font-medium leading-tight text-zinc-800 dark:text-zinc-200">
                        {member.name}
                      </p>
                      <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                        {member.character}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {trailerKey && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Trailer</h3>
              {trailerLoaded ? (
                <div className="aspect-video w-full overflow-hidden rounded">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                    title="Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setTrailerLoaded(true)}
                  className="relative aspect-video w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
                >
                  <Image
                    src={`https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg`}
                    alt="Trailer"
                    fill
                    sizes="672px"
                    className="object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-2xl text-white">
                      ▶
                    </span>
                  </span>
                </button>
              )}
            </section>
          )}

          {trivia && trivia.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {language === "es" ? "Curiosidades" : "Trivia"}
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {trivia.map((fact, index) => (
                  <li key={index}>{fact}</li>
                ))}
              </ul>
            </section>
          )}

          {postCredits && (
            <section>
              <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {language === "es" ? "Escena post-créditos" : "Post-credits scene"}
              </h3>
              {postCreditsRevealed ? (
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{postCredits}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setPostCreditsRevealed(true)}
                  className="rounded-full border border-amber-500 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                >
                  {language === "es" ? "Revelar escena post-créditos" : "Reveal post-credits scene"}
                </button>
              )}
            </section>
          )}

          <RatingsRow ratings={ratings} />
          <ProvidersBlock providers={providers} sameLabel={language === "es" ? "Disponible en" : "Available on"} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso (el modal todavía no está montado en ningún lado, eso pasa en la Tarea 8).

- [ ] **Step 4: Commit**

```bash
git add next.config.ts src/components/EntryDetailModal.tsx
git commit -m "Agregar componente EntryDetailModal"
```

---

### Task 8: Integrar todo: click para abrir, sync de URL, spoiler wiring en la tarjeta

**Files:**
- Modify: `src/components/TimelineEntryCard.tsx`
- Modify: `src/components/PhaseSection.tsx`
- Modify: `src/components/TimelineApp.tsx`

**Interfaces:**
- Consumes: `SpoilerText` (Task 6), `EntryDetailModal` (Task 7), `SpoilerProvider`/`SpoilerToggle` (Task 5).
- Produces: `TimelineEntryCard({ entry, onOpen: (id: string) => void })`; `PhaseSection({ phase, entries, onOpenEntry: (id: string) => void })`. Nada más depende de esta tarea; es la última pieza de wiring de UI antes de la curación de contenido.

- [ ] **Step 1: Reemplazar `src/components/TimelineEntryCard.tsx` completo**

```tsx
"use client";

import Image from "next/image";
import type { TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";
import { getPosterUrl, getReleaseYear } from "@/lib/tmdb";
import { getRatings } from "@/lib/ratings";
import { getProviders } from "@/lib/providers";
import { RatingsRow, ProvidersBlock } from "@/components/RatingsAndProviders";
import { SpoilerText } from "@/components/SpoilerText";

const typeLabels: Record<TimelineEntry["type"], { es: string; en: string }> = {
  movie: { es: "Película", en: "Movie" },
  tv: { es: "Serie", en: "TV show" },
  "one-shot": { es: "One-shot", en: "One-shot" },
  special: { es: "Especial", en: "Special" },
};

interface TimelineEntryCardProps {
  entry: TimelineEntry;
  onOpen: (id: string) => void;
}

export function TimelineEntryCard({ entry, onOpen }: TimelineEntryCardProps) {
  const { language } = useLanguage();
  const colors = phaseColors[entry.phase];
  const posterUrl = getPosterUrl(entry.id, "w342");
  const releaseYear = getReleaseYear(entry.id);
  const ratings = getRatings(entry.id);
  const providers = getProviders(entry.id);

  const title = language === "es" ? entry.titleEs : entry.titleEn;
  const dateLabel = language === "es" ? entry.dateLabelEs : entry.dateLabelEn;
  const justification = language === "es" ? entry.justificationEs : entry.justificationEn;

  return (
    <article
      onClick={() => onOpen(entry.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(entry.id);
        }
      }}
      className={`flex cursor-pointer gap-4 rounded-lg border-l-4 bg-zinc-50 p-4 transition-shadow duration-200 hover:shadow-md dark:bg-zinc-900 ${colors.accentBorder}`}
    >
      <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-zinc-500 dark:text-zinc-400">
            {title}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}
          >
            {language === "es" ? typeLabels[entry.type].es : typeLabels[entry.type].en}
          </span>
          {entry.outsideTime && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {language === "es" ? "Fuera del tiempo" : "Outside of time"}
            </span>
          )}
          {entry.earthVariant && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {entry.earthVariant}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dateLabel}
          {releaseYear !== null && (
            <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
              ({language === "es" ? "estreno" : "release"}: {releaseYear})
            </span>
          )}
        </p>
        <SpoilerText
          text={justification}
          isSpoiler={entry.hasFutureSpoilers}
          className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
        />

        <RatingsRow ratings={ratings} />
        <ProvidersBlock providers={providers} sameLabel={language === "es" ? "Disponible en" : "Available on"} />
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Reemplazar `src/components/PhaseSection.tsx` completo**

```tsx
"use client";

import type { Phase, TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";
import { TimelineEntryCard } from "@/components/TimelineEntryCard";

interface PhaseSectionProps {
  phase: Phase;
  entries: TimelineEntry[];
  onOpenEntry: (id: string) => void;
}

export function PhaseSection({ phase, entries, onOpenEntry }: PhaseSectionProps) {
  const { language } = useLanguage();
  const colors = phaseColors[phase.number];

  return (
    <section id={`phase-${phase.number}`} className="scroll-mt-20 py-8">
      <header className="mb-4">
        <h2 className={`text-2xl font-bold ${colors.accentText}`}>
          {language === "es"
            ? `Fase ${phase.number}: ${phase.nameEs}`
            : `Phase ${phase.number}: ${phase.nameEn}`}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {language === "es" ? phase.subtitleEs : phase.subtitleEn}
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {language === "es"
            ? "No hay entradas para los filtros seleccionados."
            : "No entries match the selected filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((entry) => (
            <TimelineEntryCard key={entry.id} entry={entry} onOpen={onOpenEntry} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Reemplazar `src/components/TimelineApp.tsx` completo**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { phases } from "@/data/phases";
import { timeline } from "@/data/timeline";
import type { EntryType } from "@/types/timeline";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { SpoilerProvider } from "@/lib/spoiler-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SpoilerToggle } from "@/components/SpoilerToggle";
import { PhaseNav } from "@/components/PhaseNav";
import { TypeFilters } from "@/components/TypeFilters";
import { PhaseSection } from "@/components/PhaseSection";
import { EntryDetailModal } from "@/components/EntryDetailModal";

const allTypes: EntryType[] = ["movie", "tv", "one-shot", "special"];

function TimelineContent() {
  const { language } = useLanguage();
  const [activeTypes, setActiveTypes] = useState<Set<EntryType>>(new Set(allTypes));
  const [activePhase, setActivePhase] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    function readFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setSelectedEntryId(params.get("entry"));
    }
    readFromUrl();
    window.addEventListener("popstate", readFromUrl);
    return () => window.removeEventListener("popstate", readFromUrl);
  }, []);

  function openEntry(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("entry", id);
    window.history.pushState({}, "", url);
    setSelectedEntryId(id);
  }

  function closeEntry() {
    const url = new URL(window.location.href);
    url.searchParams.delete("entry");
    window.history.pushState({}, "", url);
    setSelectedEntryId(null);
  }

  useEffect(() => {
    const sections = phases
      .map((phase) => document.getElementById(`phase-${phase.number}`))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const phaseNumber = Number(visible[0].target.id.replace("phase-", ""));
          setActivePhase(phaseNumber);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function toggleType(type: EntryType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next.size === 0 ? new Set(allTypes) : next;
    });
  }

  const entriesByPhase = useMemo(() => {
    const filtered = timeline.filter((entry) => activeTypes.has(entry.type));
    const grouped = new Map<number, typeof timeline>();
    for (const phase of phases) {
      grouped.set(
        phase.number,
        filtered
          .filter((entry) => entry.phase === phase.number)
          .sort((a, b) => a.order - b.order),
      );
    }
    return grouped;
  }, [activeTypes]);

  const selectedEntry = selectedEntryId
    ? timeline.find((entry) => entry.id === selectedEntryId) ?? null
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <header className="flex items-center justify-between gap-2 py-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {language === "es" ? "Timeline del UCM" : "MCU Timeline"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {language === "es"
              ? "Orden cronológico narrativo completo"
              : "Complete narrative chronological order"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SpoilerToggle />
          <LanguageToggle />
        </div>
      </header>

      <PhaseNav activePhase={activePhase} />
      <TypeFilters activeTypes={activeTypes} onToggleType={toggleType} />

      <main className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {phases.map((phase) => (
          <PhaseSection
            key={phase.number}
            phase={phase}
            entries={entriesByPhase.get(phase.number) ?? []}
            onOpenEntry={openEntry}
          />
        ))}
      </main>

      {selectedEntry && <EntryDetailModal entry={selectedEntry} onClose={closeEntry} />}
    </div>
  );
}

export function TimelineApp() {
  return (
    <LanguageProvider>
      <SpoilerProvider>
        <TimelineContent />
      </SpoilerProvider>
    </LanguageProvider>
  );
}
```

- [ ] **Step 4: Verificar en navegador (Chrome, desktop)**

Run: `npm run dev`, abrir `http://localhost:3000`.
- Click en cualquier tarjeta → se abre el modal con sinopsis/ficha técnica/trailer/ratings/streaming, y la URL cambia a `?entry=<id>`.
- Pegar directo una URL con `?entry=<id-valido>` y refrescar → el modal abre solo con esa entrada.
- Cerrar con el botón `×`, con click en el fondo oscuro, con Escape, y con el botón atrás del navegador: las cuatro formas cierran el modal y la URL vuelve a estar limpia.
- Click en el trailer (si la entrada tiene): carga el iframe, no antes.
- Activar el toggle "Sin spoilers"/"Spoiler-safe": las entradas marcadas se difuminan (ninguna todavía, porque `hasFutureSpoilers` se llena recién en las Tareas 9 a 14; confirmar solo que el toggle cambia de estado visualmente).
- Cambiar idioma con el modal abierto: todo el contenido del modal cambia de idioma sin cerrarse.

- [ ] **Step 5: Verificar en mobile (390x844) y correr build final**

Redimensionar el viewport (o DevTools mobile emulation) a 390x844 y repetir la apertura/cierre del modal. Luego:

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
git add src/components/TimelineEntryCard.tsx src/components/PhaseSection.tsx src/components/TimelineApp.tsx
git commit -m "Integrar modal de detalle: click en tarjeta, sync de URL y modo sin spoilers"
```

---

### Task 9: Curar contenido — Fase 1 (The Avengers, 15 entradas)

**Files:**
- Modify: `src/data/timeline.ts`

**Interfaces:**
- Consumes: campos `universeEn/Es`, `postCreditsEn/Es`, `triviaEn/Es`, `hasFutureSpoilers` definidos en Task 1.
- Produces: nada nuevo para otras tareas; cada tarea de curación es independiente entre sí (no hay orden obligatorio entre 9 y 14, pero se sugiere hacerlas en orden narrativo).

**Criterio de curación (aplica igual en las Tareas 9 a 14):**
- `triviaEn`/`triviaEs`: 2 a 4 bullets cortos, dato verificable (curiosidad de producción, easter egg, conexión con los cómics, récord, anécdota de casting). Si hay duda real sobre un dato en una entrada poco conocida, verificar con búsqueda web antes de escribirlo; si no se puede verificar con confianza razonable, omitir el campo en vez de adivinar.
- `postCreditsEn`/`postCreditsEs`: solo en películas, one-shots o specials donde de verdad existe una escena post-créditos memorable; 1 a 3 oraciones describiéndola. No aplica a la gran mayoría de las entradas de TV cortadas por rango de episodios (el concepto de post-créditos es de cine).
- `universeEn`/`universeEs`: solo si la entrada se aparta de Earth-616 (Sagrada Línea Temporal del UCM); el resto de las entradas queda sin este campo (la UI ya pone el default "Earth-616" cuando no está seteado).
- `hasFutureSpoilers`: `true` solo cuando `justificationEn`/`justificationEs` de esa entrada revela un evento o desenlace de una entrada distinta y posterior en el timeline (no el desenlace de la propia película). Ej: una entrada de 2015 cuya justificación menciona "esto es antes del Blip" sí califica; una entrada cuya justificación solo resume el final de su propia película no.

**Ejemplo completo ya resuelto (usar como referencia de tono y formato), entrada `iron-man` (Fase 1):**

```ts
triviaEn: [
  "Robert Downey Jr. largely improvised the line \"I am Iron Man\" at the end of the film, breaking from the genre convention of secret identities.",
  "Much of Tony Stark's dialogue in the workshop scenes was improvised; Jon Favreau let Downey riff off a loose script.",
  "The film's mid-credits scene, Nick Fury proposing the Avenger Initiative, was the first time the MCU signaled it was building a shared universe.",
],
triviaEs: [
  "Robert Downey Jr. improvisó en gran parte la frase \"Soy Iron Man\" al final de la película, rompiendo con la convención del género de mantener la identidad secreta.",
  "Buena parte de los diálogos de Tony Stark en las escenas del taller fueron improvisados; Jon Favreau dejó que Downey trabajara sobre un guion suelto.",
  "La escena post-créditos, con Nick Fury proponiendo el Avenger Initiative, fue la primera señal de que el UCM iba a ser un universo compartido.",
],
postCreditsEn:
  "Nick Fury visits Tony Stark at his mansion to tell him he is not the only superhero in the world, and proposes the \"Avenger Initiative\".",
postCreditsEs:
  "Nick Fury visita a Tony Stark en su mansión para decirle que no es el único superhéroe del mundo, y le propone el \"Avenger Initiative\".",
```

(`hasFutureSpoilers` y `universeEn/Es` no aplican a `iron-man`: no hay campo que setear.)

**Ids a cubrir en esta tarea (15, todas con `phase: 1` en `src/data/timeline.ts`):**

`eyes-of-wakanda`, `captain-america-first-avenger`, `one-shot-agent-carter`, `agent-carter-s1`, `agent-carter-s2`, `fantastic-four-first-steps`, `captain-marvel`, `iron-man`, `iron-man-2`, `one-shot-thors-hammer`, `thor`, `incredible-hulk`, `one-shot-the-consultant`, `the-avengers`, `one-shot-item-47`.

- [ ] **Step 1: Agregar los campos curados a cada una de las 15 entradas listadas**

Editar `src/data/timeline.ts`, agregando los campos correspondientes a cada objeto de entrada existente (sin tocar `titleEs`, `titleEn`, `dateLabelEn/Es`, `justificationEn/Es` ni ningún otro campo ya existente). Usar el ejemplo de `iron-man` de arriba como una de las 15.

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, sin errores de sintaxis en el archivo de datos.

- [ ] **Step 3: Verificar en navegador**

Run: `npm run dev`. Abrir el detalle de 3 o 4 entradas de la Fase 1 al azar (incluida `iron-man`) y confirmar que curiosidades y post-créditos se ven bien formateados, en ambos idiomas.

- [ ] **Step 4: Commit**

```bash
git add src/data/timeline.ts
git commit -m "Curar contenido de detalle para la Fase 1 (The Avengers)"
```

---

### Task 10: Curar contenido — Fase 2 (The Defenders, 30 entradas)

**Files:**
- Modify: `src/data/timeline.ts`

Mismo criterio de curación que la Task 9 (releer esa sección antes de empezar).

**Ejemplo completo ya resuelto**, entrada `the-defenders` (Fase 2, serie de TV, sin post-créditos por ser TV; muestra cómo curar una entrada de TV):

```ts
triviaEn: [
  "The Defenders is the first live-action team-up in Marvel TV history, bringing together the leads of four separate Netflix series.",
  "Sigourney Weaver plays Alexandra, leader of The Hand, in her first major television role.",
],
triviaEs: [
  "The Defenders es el primer equipo de superhéroes en acción real de la TV de Marvel, uniendo a los protagonistas de cuatro series distintas de Netflix.",
  "Sigourney Weaver interpreta a Alexandra, líder de La Mano, en su primer papel televisivo importante.",
],
```

**Ids a cubrir en esta tarea (30, todas con `phase: 2`):**

`iron-man-3`, `one-shot-all-hail-the-king`, `aos-s1-1-7`, `thor-dark-world`, `aos-s1-8-16`, `captain-america-winter-soldier`, `aos-s1-17-22`, `guardians-of-the-galaxy`, `guardians-of-the-galaxy-vol-2`, `daredevil-s1`, `jessica-jones-s1`, `aos-s2-1-19`, `avengers-age-of-ultron`, `aos-s2-20-22`, `ant-man`, `aos-s3-1-10`, `daredevil-s2-1-6`, `aos-s3-11-19`, `daredevil-s2-7`, `luke-cage-s1-1`, `daredevil-s2-8`, `luke-cage-s1-2`, `daredevil-s2-9`, `luke-cage-s1-3-4`, `daredevil-s2-10-11`, `luke-cage-s1-5`, `daredevil-s2-12-13`, `luke-cage-s1-6-13`, `iron-fist-s1`, `the-defenders`.

Nota: varias de estas son tramos muy cortos de la misma temporada (ej. los 8 fragmentos de `daredevil-s2-*` y `luke-cage-s1-*`, entrelazados episodio a episodio). En esos casos, en vez de forzar 2 a 4 curiosidades por cada micro-fragmento (se repetirían entre sí), es válido dejar `triviaEn/Es` solo en el primer fragmento de cada temporada (ej. `daredevil-s2-1-6` y `luke-cage-s1-1`) y omitir el campo en los fragmentos siguientes de esa misma temporada.

- [ ] **Step 1: Agregar los campos curados a las 30 entradas listadas, con la salvedad de fragmentos de la nota anterior**

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Verificar en navegador**

Run: `npm run dev`. Revisar 3 o 4 entradas al azar de la Fase 2, incluida al menos una serie de TV y una película.

- [ ] **Step 4: Commit**

```bash
git add src/data/timeline.ts
git commit -m "Curar contenido de detalle para la Fase 2 (The Defenders)"
```

---

### Task 11: Curar contenido — Fase 3 (Disassembled, 28 entradas)

**Files:**
- Modify: `src/data/timeline.ts`

Mismo criterio de curación que la Task 9. Aplica la misma salvedad de la Task 10 para fragmentos cortos de la misma temporada (varios tramos de `aos-s5-*`, `cloak-and-dagger-*`, etc.).

**Ejemplo completo ya resuelto**, entrada `avengers-infinity-war` (Fase 3, incluye `hasFutureSpoilers` porque su propia justificación no lo necesita, pero sirve de referencia de post-créditos con spoiler fuerte):

```ts
triviaEn: [
  "Thanos snapping his fingers to wipe out half of all life, known online as \"the Snap\" or \"the Blip\", became one of the most quoted moments in modern film.",
  "The Russo brothers shot Infinity War and Endgame back to back as a single production to keep continuity between both films.",
],
triviaEs: [
  "El chasquido de Thanos que borra a la mitad de toda la vida, conocido como \"el Chasquido\" o \"el Blip\", se volvió uno de los momentos más citados del cine moderno.",
  "Los hermanos Russo filmaron Infinity War y Endgame de forma consecutiva como una sola producción para mantener la continuidad entre ambas películas.",
],
postCreditsEn:
  "Nick Fury and Maria Hill turn to dust from the Snap while trying to send a distress signal; the last thing sent is a page displaying Captain Marvel's symbol.",
postCreditsEs:
  "Nick Fury y Maria Hill se desintegran por el Chasquido mientras intentan enviar una señal de auxilio; lo último que se envía es una página con el símbolo de Captain Marvel.",
```

**Ids a cubrir en esta tarea (28, todas con `phase: 3`):**

`captain-america-civil-war`, `black-widow`, `black-panther`, `aos-s3-20-22`, `inhumans`, `spider-man-homecoming`, `punisher-s1`, `doctor-strange`, `aos-slingshot`, `aos-s4`, `cloak-and-dagger-s1`, `jessica-jones-s2`, `luke-cage-s2`, `aos-s5-1-10`, `thor-ragnarok`, `iron-fist-s2`, `cloak-and-dagger-s2`, `daredevil-s3`, `runaways-s1-3`, `punisher-s2`, `jessica-jones-s3`, `aos-s5-11-18`, `ant-man-and-the-wasp`, `aos-s5-19-22`, `avengers-infinity-war`, `aos-s6`, `aos-s7`, `avengers-endgame`.

- [ ] **Step 1: Agregar los campos curados a las 28 entradas listadas**

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Verificar en navegador**

Run: `npm run dev`. Revisar el detalle de `avengers-infinity-war` y `avengers-endgame` en particular (post-créditos y curiosidades de las entregas más importantes de la fase).

- [ ] **Step 4: Commit**

```bash
git add src/data/timeline.ts
git commit -m "Curar contenido de detalle para la Fase 3 (Disassembled)"
```

---

### Task 12: Curar contenido — Fase 4 (Aftermath, 20 entradas)

**Files:**
- Modify: `src/data/timeline.ts`

Mismo criterio de curación que la Task 9. Esta fase tiene varias entradas de multiverso: `spider-man-no-way-home` y `doctor-strange-multiverse-of-madness` sí necesitan `universeEn`/`universeEs`.

**Ejemplo completo ya resuelto**, entrada `doctor-strange-multiverse-of-madness` (Fase 4, con campo de universo):

```ts
universeEn: "Mainly Earth-616, with an extended detour into Earth-838 (the Illuminati's universe).",
universeEs: "Principalmente Earth-616, con una incursión extendida en Earth-838 (el universo de los Illuminati).",
triviaEn: [
  "Earth-838 introduces the Illuminati, a team led by a variant of Professor X, with Patrick Stewart reprising the role from the original X-Men films.",
  "This is the first MCU film directed by Sam Raimi, known for the original Spider-Man trilogy and the Evil Dead horror franchise, which shows in the film's horror influences.",
],
triviaEs: [
  "Earth-838 presenta a los Illuminati, un equipo liderado por una variante del Profesor X, con Patrick Stewart retomando el papel de las películas originales de X-Men.",
  "Es la primera película del UCM dirigida por Sam Raimi, conocido por la trilogía original de Spider-Man y la saga de terror Evil Dead, lo cual se nota en las influencias de horror de la película.",
],
```

**Ids a cubrir en esta tarea (20, todas con `phase: 4`):**

`loki-s1`, `what-if-s1`, `marvel-zombies`, `wandavision`, `eternals`, `shang-chi`, `falcon-and-winter-soldier`, `thor-love-and-thunder`, `moon-knight`, `one-shot-peters-to-do-list`, `spider-man-far-from-home`, `spider-man-no-way-home`, `doctor-strange-multiverse-of-madness`, `hawkeye`, `she-hulk-1-3`, `black-panther-wakanda-forever`, `echo`, `she-hulk-4-6`, `she-hulk-7-9`, `ms-marvel`.

- [ ] **Step 1: Agregar los campos curados a las 20 entradas listadas**

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Verificar en navegador**

Run: `npm run dev`. Revisar `doctor-strange-multiverse-of-madness` y `spider-man-no-way-home`: confirmar que la línea de universo aparece en el modal, distinta del default de Earth-616.

- [ ] **Step 4: Commit**

```bash
git add src/data/timeline.ts
git commit -m "Curar contenido de detalle para la Fase 4 (Aftermath)"
```

---

### Task 13: Curar contenido — Fase 5 (Variance, 19 entradas)

**Files:**
- Modify: `src/data/timeline.ts`

Mismo criterio de curación que la Task 9. Esta fase tiene el mayor peso de multiverso: `loki-s2`, `what-if-s2`, `what-if-s3`, `deadpool-and-wolverine` necesitan `universeEn`/`universeEs`. `deadpool-and-wolverine` en particular es un buen candidato a `hasFutureSpoilers` si su justificación menciona el colapso de la Sagrada Línea Temporal visto en Loki.

**Ejemplo completo ya resuelto**, entrada `deadpool-and-wolverine` (Fase 5):

```ts
universeEn: "Earth-10005 (the Fox/Deadpool universe) crossing into the main MCU timeline via the TVA.",
universeEs: "Earth-10005 (el universo de Fox/Deadpool) cruzándose con la línea temporal principal del UCM a través de la AVT.",
triviaEn: [
  "This is the first R-rated film to be part of the official MCU timeline rather than treated as a separate continuity.",
  "Several actors reprise roles from 20th Century Fox's X-Men films as \"variants\", officially folding decades of Fox Marvel movies into the MCU multiverse.",
],
triviaEs: [
  "Es la primera película clasificación R que forma parte oficial de la línea temporal del UCM en vez de tratarse como una continuidad aparte.",
  "Varios actores retoman papeles de las películas de X-Men de 20th Century Fox como \"variantes\", incorporando oficialmente décadas de películas de Marvel de Fox al multiverso del UCM.",
],
```

**Ids a cubrir en esta tarea (19, todas con `phase: 5`):**

`ironheart`, `secret-invasion`, `the-marvels`, `gotg-holiday-special`, `werewolf-by-night`, `wonder-man`, `ant-man-quantumania`, `loki-s2`, `what-if-s2`, `what-if-s3`, `deadpool-and-wolverine`, `guardians-of-the-galaxy-vol-3`, `agatha-all-along`, `daredevil-born-again-s1`, `captain-america-brave-new-world`, `thunderbolts`, `daredevil-born-again-s2`, `punisher-one-shot-special`, `spider-man-brand-new-day`.

- [ ] **Step 1: Agregar los campos curados a las 19 entradas listadas**

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Verificar en navegador**

Run: `npm run dev`. Revisar `deadpool-and-wolverine` y `loki-s2`: confirmar la línea de universo y, si aplica, el toggle de spoilers ocultando la justificación correctamente.

- [ ] **Step 4: Commit**

```bash
git add src/data/timeline.ts
git commit -m "Curar contenido de detalle para la Fase 5 (Variance)"
```

---

### Task 14: Curar contenido — Fase 6 (DOOM, 2 entradas, no estrenadas)

**Files:**
- Modify: `src/data/timeline.ts`

**Ids a cubrir (2, ambas con `phase: 6`):** `avengers-doomsday`, `avengers-secret-wars`.

Ninguna de las dos está estrenada todavía (2026 y 2027 respectivamente): no llevan `triviaEn/Es` ni `postCreditsEn/Es` (no hay forma de verificarlos sin inventar). Solo llevan `universeEn/Es`, apoyado en la premisa pública y ya anunciada de ambas películas (colisión de líneas temporales del multiverso, no un detalle de trama no revelado).

```ts
// avengers-doomsday
universeEn: "Multiple Earths of the multiverse converging, including variants from the Fox X-Men universe.",
universeEs: "Convergencia de múltiples Earths del multiverso, incluidas variantes del universo de X-Men de Fox.",

// avengers-secret-wars
universeEn: "The point where the converging multiverse timelines are set to collide directly.",
universeEs: "El punto donde las líneas temporales del multiverso que están convergiendo colisionan de forma directa.",
```

- [ ] **Step 1: Agregar `universeEn`/`universeEs` a `avengers-doomsday` y `avengers-secret-wars`**

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/data/timeline.ts
git commit -m "Agregar nota de universo para la Fase 6 (DOOM)"
```

---

### Task 15: Actualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Documentar los campos, componentes y scripts nuevos**

Agregar, en la sección "Stack y estructura" (después del bullet de "Puntuaciones"), un bullet nuevo:

```markdown
- **Vista de detalle:** cada tarjeta abre un modal (`EntryDetailModal`) sincronizado con `?entry=<id>` en la URL (History API nativa, sin `next/navigation`). Trae sinopsis/ficha técnica/trailer de TMDB (ver más abajo) y contenido curado a mano por entrada: `universeEn/Es` (variante de universo, default Earth-616 si no está seteado), `triviaEn/Es` (curiosidades), `postCreditsEn/Es` (solo películas/one-shots/specials). Modo "sin spoilers" opcional (toggle junto al de idioma, persistido en `localStorage`) difumina la justificación cronológica en las entradas con `hasFutureSpoilers: true`.
```

Y actualizar el bullet de "Scripts de build de datos" para reflejar los campos nuevos que trae `fetch-tmdb.ts`:

```markdown
- **Scripts de build de datos** (`scripts/`, se corren manualmente con `npx tsx scripts/<nombre>.ts` tras editar `timeline.ts`): `fetch-tmdb.ts` (posters/backdrops/sinopsis ES-EN/ficha técnica/trailer → `src/data/tmdb-cache.json`), `fetch-providers.ts` (streaming → `src/data/providers-cache.json`), `fetch-ratings.ts` (ratings → `src/data/ratings-cache.json`). Los tres se basan en `tmdbSearchTitle`/`tmdbMediaType`/`tmdbYear` de cada entrada.
```

- [ ] **Step 2: Registrar en "Decisiones pendientes" que esta fase quedó completa**

Actualizar la sección para reflejar que la vista de detalle y el enriquecimiento de contenido ya están implementados y verificados.

- [ ] **Step 3: Agregar cualquier lección aprendida real**

Si durante la implementación de las Tareas 1 a 14 surgió algún error real no anticipado por este plan (ej. un caso de match de TMDB que rompió el patrón, un dato de curación que hubo que corregir), documentarlo en "Registro de errores y lecciones aprendidas" siguiendo el formato ya establecido (Fecha / Qué pasó / Causa raíz / Regla derivada). Si no hubo ningún error real, no agregar una entrada vacía.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Actualizar CLAUDE.md tras agregar la vista de detalle y el enriquecimiento de contenido"
```
