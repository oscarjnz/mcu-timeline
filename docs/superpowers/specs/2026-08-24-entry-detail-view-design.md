# Vista de detalle por entrega + enriquecimiento de contenido

Fecha: 2026-08-24

## Contexto y objetivo

Hoy el timeline muestra, por cada entrega, una tarjeta con poster, título, badges, fecha in-universe/estreno, la justificación cronológica, ratings y streaming. Todo el contenido vive directo en la tarjeta; no hay forma de ver más detalle de una entrega puntual.

El objetivo es que cada tarjeta sea clickeable y abra una vista de detalle con: sinopsis, ficha técnica (director, elenco, duración, género), universo/variante donde se ubica la historia, trailer, curiosidades y (cuando aplica) la escena post-créditos. El resto del contenido debe sentirse curado por alguien que conoce el UCM a fondo, no solo un volcado de campos de una API.

## Alcance

Incluido:
- Modal de detalle abierto por click en cualquier tarjeta, sincronizado con la URL (`?entry=<id>`).
- Enriquecimiento automático vía TMDB: sinopsis ES/EN, tagline, duración, géneros, director, elenco principal, trailer.
- Campo de universo/variante (Earth-616 por defecto, texto propio en las entregas de multiverso).
- Contenido curado a mano: 2-3 curiosidades por entrega y, donde aplica (películas/one-shots/specials), la escena post-créditos.
- Modo "sin spoilers" global, opcional, que difumina la justificación cronológica en las entradas marcadas como spoiler de eventos futuros.

Explícitamente fuera de alcance (decidido en brainstorming, tier 3 no elegido):
- Grafo de conexiones cruzadas navegable entre entregas ("esto prepara X", "esto hace referencia a Y").
- Cualquier sistema de tracking dedicado (Piedras del Infinito, primeras apariciones de personajes, etc.) como feature aparte; si sale naturalmente, va como una curiosidad más, no como un campo/UI dedicado.

## Arquitectura

### 1. Apertura del detalle (URL-synced modal)

- La tarjeta (`TimelineEntryCard`) se vuelve clickeable como un todo (`role="button"`, cursor pointer, resalte en hover ya existente se mantiene). El click hace `router.push(pathname + "?entry=" + entry.id, { scroll: false })`.
- Un componente nuevo `EntryDetailModal` vive en `TimelineApp` (o en `page.tsx`), lee `useSearchParams().get("entry")`, busca la entrada en `timeline` por id y, si existe, renderiza el overlay.
- Cerrar el modal: click en el backdrop, botón "×", o tecla Escape → `router.back()` si el historial tiene la navegación previa, si no `router.push(pathname, { scroll: false })`.
- El modal no cambia el scroll de la página de fondo (se bloquea `overflow` del body mientras está abierto).
- Sin rutas nuevas de Next.js (nada de intercepting routes/parallel routes): todo vive en el mismo árbol de componentes cliente que ya existe, coherente con que el sitio es una sola página con toggles.

### 2. Contenido del modal

Orden de secciones:
1. Backdrop (si existe en TMDB) + poster + título + badges (tipo, fase, fuera del tiempo/variante Earth si aplica) + fecha in-universe con año de estreno real entre paréntesis (reutiliza lógica ya existente).
2. Tagline (TMDB), en cursiva, si existe.
3. Línea de universo: `entry.universeEs`/`universeEn` si está seteado, si no el default "Earth-616 (universo principal del UCM)".
4. Sinopsis oficial (TMDB overview ES/EN; fallback a EN si no hay traducción ES; fallback a la justificación existente si TMDB no trae overview, ej. entradas no estrenadas).
5. Justificación cronológica (contenido ya existente), envuelta en el wrapper de spoiler si `entry.hasFutureSpoilers` es true y el modo sin spoilers está activo.
6. Ficha técnica: director (o creador, para TV), elenco principal (hasta 6, foto + nombre + personaje), duración/formato episodios, géneros.
7. Trailer: thumbnail de YouTube clickeable que carga el iframe embed al hacer click (no autoplay, no carga por defecto).
8. Curiosidades: lista de 2-4 bullets.
9. Escena post-créditos (si existe el campo): oculta detrás de un botón "Revelar escena post-créditos" siempre, sin importar el modo sin spoilers global (es spoiler por naturaleza).
10. Ratings (IMDb/RT/TMDB) y streaming (US/DO): reutiliza los subcomponentes que ya existen en `TimelineEntryCard`, movidos a componentes compartidos si hace falta para no duplicar JSX.

Si una sección no tiene datos (ej. sin trailer, sin curiosidades en una entrada de 2026 no estrenada), esa sección simplemente no se renderiza — nunca placeholders tipo "sin datos".

### 3. Modelo de datos

`src/types/timeline.ts` — nuevos campos opcionales en `TimelineEntry`:

```ts
universeEn?: string;
universeEs?: string;
postCreditsEn?: string;
postCreditsEs?: string;
triviaEn?: string[];
triviaEs?: string[];
hasFutureSpoilers?: boolean;
```

Todos opcionales: una entrada sin estos campos sigue funcionando exactamente igual que hoy, solo que el modal muestra menos secciones.

### 4. Enriquecimiento vía TMDB

Se extiende `scripts/fetch-tmdb.ts` (mismo script, mismo archivo de salida `src/data/tmdb-cache.json`) en vez de crear un script paralelo, para no duplicar la lógica de búsqueda/match que ya existe y ya fue corregida (ver lecciones aprendidas en `CLAUDE.md`).

`TmdbCacheEntry` gana:

```ts
export interface TmdbCacheEntry {
  tmdbId: number;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  overviewEn: string | null;
  overviewEs: string | null;
  tagline: string | null;
  runtimeMinutes: number | null;   // películas: runtime; TV: episode_run_time[0]
  genres: string[];                // nombres de género en español (TMDB los trae localizados)
  director: string | null;         // películas: crew job=Director; TV: created_by.join(", ")
  cast: { name: string; character: string; profilePath: string | null }[]; // hasta 6
  trailerKey: string | null;       // YouTube key, prioriza Trailer oficial en español, si no en inglés
}
```

Notas de implementación:
- Un fetch a `/movie/{id}` o `/tv/{id}` con `append_to_response=credits,videos` y `language=en-US` trae runtime/géneros/crew/cast/videos de una vez.
- Un segundo fetch liviano con `language=es-ES` (mismo endpoint, sin append) trae `overview` y `tagline` en español (TMDB no siempre tiene traducción; si `overview` viene vacío, `overviewEs` queda `null` y la UI cae a inglés).
- Para TV con `Season N` en el título (ya existe `fetchSeasonAirYear` con esta lógica), el overview usado es el de la temporada completa (`/tv/{id}/season/{n}`, con su propio `language=es-ES`/`en-US`), no el de la serie completa, siguiendo el mismo patrón que ya corrige el año de estreno.
- `director` para TV: no hay "director" por temporada en TMDB; se usa `created_by` de la serie.
- `trailerKey`: de `videos.results`, filtrar `type === "Trailer"` y `site === "YouTube"`, preferir `official === true`, más reciente primero.
- Rate limit: se mantiene el `setTimeout(60ms)` ya existente entre entradas; ahora son 2-3 requests por entrada en vez de 1, así que el script tarda más pero sigue siendo un job manual, no de build.
- Entradas sin match en TMDB (ya se registran como "misses") o con overview vacío simplemente no muestran esas secciones — no se inventa nada.

`src/lib/tmdb.ts` gana getters: `getOverview(id, lang)`, `getTagline(id)`, `getRuntimeLabel(id, type, lang)`, `getGenres(id)`, `getDirector(id)`, `getCast(id)`, `getTrailerKey(id)`.

### 5. Modo sin spoilers

- Nuevo contexto `src/lib/spoiler-context.tsx`, mismo patrón que `language-context.tsx` (estado + persistencia en `localStorage`, default `false`/apagado para no cambiar el comportamiento actual del sitio).
- Toggle nuevo junto al `LanguageToggle` existente en el header.
- Componente `SpoilerText` (o similar) envuelve el párrafo de justificación cuando `entry.hasFutureSpoilers` es true: si el modo está activo, aplica `blur` + overlay "Contiene spoilers de eventos futuros · click para revelar"; al hacer click revela permanentemente ese párrafo puntual durante la sesión.
- Se usa en `TimelineEntryCard` (la tarjeta de la lista, donde ya se muestra la justificación hoy) y en la sección de justificación del modal — mismo componente, dos lugares.
- La escena post-créditos usa el mismo patrón visual de "click para revelar" pero SIEMPRE oculta, sin ligarse al toggle global (ver sección 2, punto 9).

### 6. Curación de contenido (`src/data/timeline.ts`)

- Por cada entrada, cuando aplique: `universeEn/Es` (solo en las que se apartan de Earth-616 principal — Loki, Doctor Strange in the Multiverse of Madness, Spider-Man: No Way Home, What If...?, Deadpool & Wolverine, y cualquier otra que corresponda tras revisar el catálogo completo), `triviaEn/Es` (2-4 bullets), `postCreditsEn/Es` (solo películas/one-shots/specials donde de verdad hay escena, y algún finale de temporada puntual si es un hecho verificable, ej. Loki temporada 1), `hasFutureSpoilers` (true en las entradas cuya justificación menciona explícitamente eventos posteriores, ej. "tras el Blip", quién muere, etc.).
- Se escribe en tandas por fase (las 6 fases ya definidas en `src/data/phases.ts`), verificando `npm run build` y una pasada visual en navegador después de cada tanda, con un commit por tanda.
- Para entradas oscuras (one-shots viejos, specials poco vistos) o para verificar un dato antes de escribirlo como curiosidad, se usa búsqueda web puntual en vez de completar de memoria si hay duda real.
- Avengers: Doomsday (2026) y Avengers: Secret Wars (2027) quedan sin `postCreditsEn/Es` ni `triviaEn/Es` por ahora (no estrenadas); si TMDB ya tiene reparto anunciado se refleja en la ficha técnica del modal, sin inventar sinopsis ni escenas.

### 7. Componentes nuevos/modificados

- `src/components/EntryDetailModal.tsx` — nuevo.
- `src/components/SpoilerText.tsx` — nuevo, reutilizado por card y modal.
- `src/lib/spoiler-context.tsx` — nuevo.
- `src/components/SpoilerToggle.tsx` — nuevo, análogo a `LanguageToggle`.
- `src/components/TimelineEntryCard.tsx` — se agrega el click-to-open y el uso de `SpoilerText`; posible extracción de `WatchProviderRow`/bloque de ratings a un archivo compartido si el modal los reutiliza tal cual (evaluar durante implementación si vale la pena vs. duplicar ~15 líneas).
- `src/lib/tmdb.ts` — nuevos getters.
- `src/types/timeline.ts` — nuevos campos opcionales.
- `scripts/fetch-tmdb.ts` — extendido, no reemplazado.
- `src/data/timeline.ts` — contenido curado agregado por fase.
- `CLAUDE.md` — actualizar sección de stack/scripts para documentar los campos nuevos, y agregar cualquier lección aprendida real que surja durante la implementación (siguiendo la convención ya establecida del archivo).

## Testing / verificación

No hay suite de tests automatizados en el proyecto (confirmado en `CLAUDE.md`). Verificación manual en navegador (Chrome) por cada tanda:
- Abrir y cerrar el modal por click, por Escape, por botón atrás del navegador.
- Confirmar que el link `?entry=<id>` es compartible (pegarlo directo en la barra abre el modal correspondiente).
- Toggle de idioma dentro del modal abierto (debe reaccionar igual que el resto del sitio).
- Toggle de modo sin spoilers: entradas marcadas se difuminan/revelan correctamente, tanto en tarjeta como en modal.
- Trailer: el iframe no carga hasta hacer click.
- Entradas sin poster/trailer/curiosidades no rompen el layout (secciones ausentes, no huecos vacíos).
- Mobile (390x844) y desktop, como ya se hizo en la pasada de UI anterior.

## Riesgos conocidos

- **Exactitud de contenido curado en entradas oscuras**: mitigado verificando con búsqueda web antes de escribir, y omitiendo el campo en vez de adivinar si no hay certeza razonable.
- **TMDB sin traducción al español** en overview/tagline de títulos poco populares: mitigado con fallback a inglés, ya es el patrón que sigue el resto del sitio (ver ratings/providers).
- **Duración/sinopsis poco representativa en entradas de TV cortadas por rango de episodios**: se documenta como limitación conocida (overview es de la temporada completa, no del rango específico); el peso de precisión ahí recae en la justificación cronológica ya existente, no en el overview.
