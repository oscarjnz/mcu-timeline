# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

A día de hoy (2026-07-16), el proyecto es un sitio web (MCU Timeline) que presenta el orden cronológico y narrativo completo del universo cinematográfico de Marvel, en español (principal) e inglés (toggle), basado en notas de un foro de Reddit que corrigen el timeline oficial. Repositorio git inicializado con `create-next-app`. Stack: Next.js (App Router) + TypeScript + Tailwind CSS.

Fuente de contenido y decisiones de estructura documentadas en la memoria persistente del agente (`[[proyecto-web-mcu-timeline]]`, `[[mcu-timeline-datos-fuente]]`, `[[mcu-timeline-estructura-fases]]`), no en este repositorio, para evitar duplicar el texto largo aquí.

## Stack y estructura

- **Framework:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, ESLint.
- **Idiomas:** toggle ES/EN en la misma página (sin rutas separadas), español por defecto.
- **Datos:** catálogo propio de 127 entradas (películas, series, one-shots, specials) en un archivo de datos tipado dentro de `src/`, cada una con título ES/EN, fase (0-6, ver X-Men más abajo), tipo, fecha/año in-universe, justificación cronológica ES/EN, y referencia a TMDB para poster/metadata.
- **API externa:** TMDB (The Movie Database) para posters, metadata verificada y disponibilidad de streaming (`watch/providers`, regiones US y DO). Credenciales en `.env.local` (excluido de git via `.gitignore`, patrón `.env*`). Resolución de posters pensada para build time, no llamadas cliente con la key expuesta.
- **Puntuaciones:** rating de TMDB siempre disponible (no requiere key adicional). IMDb y Rotten Tomatoes vía OMDb API (`OMDB_API_KEY` opcional en `.env.local`); si no está seteada, esos dos campos simplemente quedan vacíos y solo se muestra TMDB. El usuario intentó sacar una key en omdbapi.com y le dio error de servidor al registrarse; la API en sí funciona (verificado), así que es un problema puntual del registro (probable con emails Yahoo/Hotmail/Outlook/Live, según la propia doc de OMDb) que puede reintentar más tarde.
- **Scripts de build de datos** (`scripts/`, se corren manualmente con `npx tsx scripts/<nombre>.ts` tras editar `timeline.ts`): `fetch-tmdb.ts` (posters/backdrops/sinopsis ES-EN/ficha técnica/trailer/`releaseDate` exacto → `src/data/tmdb-cache.json`), `fetch-providers.ts` (streaming → `src/data/providers-cache.json`), `fetch-ratings.ts` (ratings → `src/data/ratings-cache.json`). Los tres se basan en `tmdbSearchTitle`/`tmdbMediaType`/`tmdbYear` de cada entrada. `fetch-tmdb.ts` prioriza coincidencia exacta de título normalizado por encima de coincidencia de año (ver lección aprendida del 2026-08-25 más abajo); el año solo desempata entre varios resultados que ya matchean el título exacto.
- **Vista de detalle:** cada tarjeta abre un modal (`EntryDetailModal`) sincronizado con `?entry=<id>` en la URL (History API nativa, sin `next/navigation`; `closeEntry` deshace el `pushState` con `history.back()` cuando el modal se abrió desde la propia app, y usa `replaceState` cuando se entra directo por un link compartido con `?entry=`). Trae sinopsis/ficha técnica/trailer de TMDB (ver arriba) y contenido curado a mano por entrada: `universeEn/Es` (variante de universo, default Earth-616 si no está seteado), `triviaEn/Es` (curiosidades), `postCreditsEn/Es` (solo películas/one-shots/specials). Modo "sin spoilers" opcional (toggle junto al de idioma, persistido en `localStorage`) difumina la justificación cronológica en las entradas con `hasFutureSpoilers: true`.
- **X-Men (Earth-10005):** las 13 películas de X-Men de la era Fox (2000-2020, incluida `X-Men: Apocalypse`) están cargadas como `phase: 0` en `timeline.ts`, un grupo independiente de las Fases 1-6 del UCM (con su propio color amarillo en `phase-colors.ts` y su propia entrada en `phases.ts`), pero intercaladas por su propia fecha in-universe dentro del timeline vertical, no como bloque aparte. `TimelineApp.tsx` ordena el catálogo completo por `order` (los X-Men usan valores decimales, ej. `order: 6.1`, para insertarse entre los enteros de las entradas del UCM sin renumerar las 114 ya existentes) y agrupa dinámicamente en "corridas" contiguas por número de fase (`groupIntoRuns`), así que una Fase del UCM puede partirse en varias secciones si una película de X-Men cae en medio de su rango de fechas; cada entrada de X-Men lleva `earthVariant: "Earth-10005"` (badge visual reusado del campo ya existente) y `universeEn/Es`. Motivo: el elenco original de la trilogia 2000s (Patrick Stewart, Ian McKellen, Alan Cumming, Rebecca Romijn, James Marsden, Kelsey Grammer) está confirmado regresando como variantes en Avengers: Doomsday (2026); Earth-10005 ya estaba confirmado en pantalla como el universo Fox-X-Men desde Deadpool & Wolverine (2024).
- **Vistas del timeline:** además de la vista cronológica narrativa (default), hay un selector (`ViewModeToggle`) con "Orden de estreno" (`ReleaseOrderList`, agrupa todo el catálogo por año real de estreno usando el `releaseDate` exacto del cache de TMDB, no solo el año, para desempatar estrenos del mismo año) y "Countdown to Doomsday" (`DoomsdayCountdownView`, filtra a las ~15 entradas marcadas `inDoomsdayCountdown: true`, la lista esencial que Disney+ publicó para prepararse para Avengers: Doomsday, incluye `x-men` y `x2`). Toggle "Solo películas" (`MoviesOnlyToggle`) aplica sobre cualquier vista, ocultando series/one-shots/specials.
- **Extranjerismos:** términos que son nombres propios de saga/equipo tomados directamente de Marvel (`The Avengers`, `The Defenders`, `Disassembled`) se dejan sin traducir en ambos idiomas, en cualquier lugar donde aparezcan (nombre de fase, título de película, justificación), por decisión explícita del usuario. No traducir a "Vengadores"/"Defensores"/"Desarmados" aunque exista una traducción oficial de doblaje.
- **Títulos de entregas (regla estricta, sin excepción):** `titleEs` de cada entrada en `timeline.ts` debe ser idéntico a `titleEn`, siempre el nombre original en inglés. Nunca usar el título doblado/traducido al español (ni "Capitana Marvel", ni "El Increíble Hulk", ni "Guardianes de la Galaxia", etc.), tanto en el campo `titleEs` como en cualquier mención cruzada dentro de `justificationEs` de otra entrada. Solo el resto del texto (justificación, `dateLabel`, tipo, badges de fase) se traduce; el nombre propio de la obra no.
- **Fecha in-universe vs. fecha real de estreno:** `dateLabel` es la ubicación de la historia dentro de la cronología narrativa (ej. Avengers: Endgame = "2023" porque la trama salta 5 años tras el chasquido), no el año en que se estrenó en el mundo real (Endgame se estrenó en 2019). Son dos ejes distintos a propósito: el sitio existe precisamente para reordenar el catálogo por fecha narrativa en vez de por fecha de estreno. Para que no se lea como un error de dato, cada tarjeta muestra ambas: el `dateLabel` in-universe y, entre paréntesis, "(estreno: AÑO)" con el año real, calculado en build time por `scripts/fetch-tmdb.ts` (`releaseYear` en `tmdb-cache.json`, expuesto por `getReleaseYear` en `src/lib/tmdb.ts`). Para series con temporadas partidas en varias entradas del timeline (ej. Agents of S.H.I.E.L.D.), el año de estreno se resuelve por temporada específica (parseando "Season N" del título y pidiendo `/tv/{id}/season/{n}` a TMDB), no el de la temporada 1 del show completo.
- **Layout:** timeline vertical continuo, agrupado y coloreado por fase, con navegación sticky por fase y filtros por tipo/fase.
- **Preview social del link (OG/Twitter card):** `src/app/opengraph-image.tsx` y `src/app/twitter-image.tsx` (convención de archivos de Next.js) generan en build time una imagen 1200x630 vía `next/og` (`ImageResponse`), con la lógica y el JSX compartidos en `src/lib/og-image.tsx`. Diseño: wordmark "MARVEL" en rojo (`#ED1D24`) con la fuente Anton (Google Font OFL, bundleada en `src/lib/fonts/Anton-Regular.ttf`, no se usa la tipografía oficial de Marvel por temas de licencia) e inclinación `skewX` imitando el logo real, subtítulo "TIMELINE DEL UCM" y los puntos de colores por fase (mismos colores que `phase-colors.ts`) reusando el motivo visual del favicon (`icon.png`). El font se carga con `readFile(new URL("./fonts/Anton-Regular.ttf", import.meta.url))`, no con `fetch(new URL(...))` (ver lección aprendida del 2026-08-25 sobre Turbopack). `layout.tsx` define `metadataBase` a partir de `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`): **hay que setear esa env var en Vercel con el dominio real de producción** para que las tags `og:image`/`twitter:image` resuelvan a una URL absoluta correcta; si no se setea, el preview del link va a apuntar a localhost y no va a funcionar en producción.

## Cómo correr el proyecto localmente

```
npm install
npm run dev
```

## Cómo testearlo

Aún no se definieron tests automatizados (proyecto de contenido/UI). Verificación manual en navegador (Chrome) del toggle de idioma, filtros y carga de posters antes de dar por terminada cualquier tarea de UI.

## Propósito de este archivo

Este documento es la memoria activa del proyecto: el lugar donde se acumula todo lo que hay que saber para trabajar aquí sin repetir errores ni perder contexto entre sesiones.

Reglas de uso, sin excepción:

- Se consulta antes de responder cualquier tarea sobre este proyecto.
- Se actualiza después de cada error real que ocurra durante el trabajo, registrándolo en la sección de abajo para que no vuelva a pasar.
- Es el archivo más protegido del proyecto: cualquier cambio debe ser deliberado y reflejar algo verdadero sobre el proyecto, nunca relleno ni información inventada.

## Registro de errores y lecciones aprendidas

- **Fecha:** 2026-07-16
- **Qué pasó:** varias series (ej. Daredevil temporadas 1-3) y un one-shot (`The Consultant`) mostraban el poster equivocado, de otra entrega distinta a la esperada.
- **Causa raíz:** `scripts/fetch-tmdb.ts` tomaba siempre el primer resultado de `search/movie` o `search/tv` sin verificar que el nombre coincidiera. TMDB ordena por popularidad, no por coincidencia exacta de título, así que un título de búsqueda ambiguo (ej. "Daredevil", que también matchea "Daredevil: Born Again") o poco específico (ej. "The Consultant", que matchea "The Christmas Consultant") podía resolver a un ítem completamente distinto.
- **Regla derivada para evitarlo:** el script ahora prioriza coincidencia exacta de título normalizado (o de año/fecha si `tmdbYear` está seteado) antes de caer al primer resultado. Además, al agregar `tmdbSearchTitle` para una entrada, usar el título más específico posible (ej. `"Marvel's Daredevil"` en vez de `"Daredevil"`, `"Marvel One-Shot: The Consultant"` en vez de `"The Consultant"`) y correr `npx tsx scripts/audit` (recrear el script de auditoría si hace falta: compara el `name`/`title` real del `tmdbId` cacheado contra `tmdbSearchTitle`) tras cualquier cambio masivo de posters.

- **Fecha:** 2026-07-16
- **Qué pasó:** el usuario tuvo que pedir dos veces que se quitara la traducción al español de los títulos de las entregas (primero para "Avengers/Defenders/Disassembled", después de nuevo para el resto del catálogo: "Capitana Marvel", "El Increíble Hulk", "Guardianes de la Galaxia", etc., 79 entradas en total, más 7 referencias cruzadas sueltas en justificaciones). También se confundió con que `dateLabel` mostrara una fecha in-universe distinta a la de estreno real (ej. Endgame "2023") sin ninguna aclaración visual, y lo interpretó como un error de dato repetido.
- **Causa raíz:** al aplicar la regla de extranjerismos solo se corrigieron los 3 términos que el usuario mencionó explícitamente (Avengers/Defenders/Disassembled) en vez de aplicar el criterio de fondo ("el nombre de una entrega no se traduce") a todo el catálogo de una sola pasada. Por separado, el diseño de fecha in-universe nunca se explicó en la UI, solo en `CLAUDE.md`, que el usuario no lee directamente.
- **Regla derivada para evitarlo:** cuando una instrucción de "no traducir X" tiene una razón de fondo generalizable (nombres propios de obras no se traducen), aplicarla a todo el dataset en la misma tarea, no solo a los ejemplos citados por el usuario; después correr una búsqueda de `titleEn !== titleEs` sobre las 114 entradas para confirmar cobertura total, y otra búsqueda de fragmentos de títulos traducidos dentro de `justificationEs` (referencias cruzadas). Cualquier par de fechas que puedan parecer contradictorias a alguien sin contexto del proyecto (in-universe vs. estreno real) debe aclararse en la propia UI, no solo en la documentación interna.

- **Fecha:** 2026-08-24
- **Qué pasó:** en desktop, con una entrada de contenido muy alto (mucho texto de sinopsis/curiosidades), el botón `×` de cierre del `EntryDetailModal` quedaba fuera del viewport, inalcanzable sin hacer scroll dentro del propio modal.
- **Causa raíz:** el modal combinaba `sm:items-center` (centrado vertical del contenedor) con `overflow-y-auto` en el contenido interno. Cuando el contenido curado superaba la altura del viewport, el centrado vertical empujaba la parte superior del modal, donde vive el botón de cierre, por encima del borde visible de la pantalla.
- **Regla derivada para evitarlo:** en modales con contenido de longitud variable (especialmente si el contenido depende de datos curados que pueden crecer con el tiempo), no combinar centrado vertical del contenedor (`items-center`) con overflow interno; anclar el modal arriba (quitar `items-center` en el breakpoint relevante) para que el header con el botón de cierre quede siempre dentro del viewport, sin importar cuánto crezca el contenido de abajo.

- **Fecha:** 2026-08-25
- **Qué pasó:** al agregar las 13 entradas de X-Men, `x-men` (2000) resolvió al documental corto "X-Men: The Mutant Watch" (22 min) en vez de la película real dirigida por Bryan Singer, y `x2` (2003) resolvió a un featurette "X2 Global Webcast Highlights" en vez de la película real.
- **Causa raíz:** `scripts/fetch-tmdb.ts` ya tenía logica de match exacto de título (lección del 2026-07-16), pero la aplicaba como *fallback* solo si no había match de año; como el documental y la película real comparten el mismo año de estreno, el primer resultado que matcheaba el año (el documental, más popular en TMDB) se devolvía antes de siquiera llegar a comparar títulos exactos.
- **Regla derivada para evitarlo:** el orden de prioridad correcto es título exacto primero, año como desempate después, nunca al revés. `searchTmdb` ahora filtra primero por título exacto normalizado; si hay varios resultados con título exacto, ahí sí usa el año para desempatar; el año como único criterio de match solo se usa si no hay ningún resultado con título exacto. Esto aplica en cualquier título corto o genérico que pueda coincidir con un documental/featurette/making-of del mismo año (frecuente en franquicias grandes como X-Men).

- **Fecha:** 2026-08-25
- **Qué pasó:** al generar la imagen OG/Twitter (`src/lib/og-image.tsx`) cargando la fuente Anton local con `fetch(new URL("./fonts/Anton-Regular.ttf", import.meta.url))` (el patrón que documenta Next.js para `next/og`), `npm run build` fallaba en la etapa de prerender de `/opengraph-image` con `TypeError: fetch failed` / `Error: not implemented... yet...`.
- **Causa raíz:** Next.js 16 usa Turbopack por defecto para `next build`, y el `fetch()` de Turbopack todavía no implementa el protocolo `file://` (solo hace fetch de red real), así que el patrón `fetch(new URL(..., import.meta.url))` que sí funciona con webpack rompe el build con Turbopack.
- **Regla derivada para evitarlo:** para cargar un asset local (fuente, etc.) dentro de una ruta `next/og`/`opengraph-image` en este proyecto, usar `readFile` de `node:fs/promises` pasándole directamente el `URL` (`readFile(new URL("./archivo", import.meta.url))`, sin envolver con `fileURLToPath`, que además rompía con otro error de Turbopack), no `fetch`. Verificar siempre con `npm run build` (no solo `npm run dev`) cualquier ruta que genere imágenes con `next/og`, porque este bug solo aparece en el build de producción con Turbopack, no en dev.

Formato para cada entrada nueva:

- **Fecha:**
- **Qué pasó:**
- **Causa raíz:**
- **Regla derivada para evitarlo:**

## Decisiones pendientes

Ya resueltas: de qué trata el proyecto, stack técnico, cómo correrlo y cómo testearlo (ver secciones de arriba).

Ya resueltas también: estructura de carpetas (`src/data` para datos y cache TMDB, `src/lib` para utilidades y contexto, `src/components` para UI, `src/types` para tipos), y datos de Avengers: Doomsday (2026) y Avengers: Secret Wars (2027) ya cargados en `src/data/timeline.ts` dentro de la Fase 6 "DOOM".

Ya resuelta también, a día de hoy (2026-08-25): la vista de detalle por entrada y el enriquecimiento de contenido curado (`docs/superpowers/specs/2026-08-24-entry-detail-view-design.md`, `docs/superpowers/plans/2026-08-24-entry-detail-view.md`, 15 tareas completas). Modal de detalle con sinopsis/ficha técnica/trailer de TMDB, `universeEn/Es`, `triviaEn/Es`, `postCreditsEn/Es` y modo "sin spoilers" implementados y verificados; las 114 entradas del catálogo original (Fases 1 a 6) tienen su contenido curado y fact-checkeado vía búsqueda web.

Ya resuelta también, a día de hoy (2026-08-25): las 13 películas de X-Men de Fox (Earth-10005, Fase 0) cargadas e intercaladas cronológicamente, y las 3 vistas del timeline (cronológico, orden de estreno, Countdown to Doomsday) con el toggle de "solo películas". Ver bullets de "X-Men (Earth-10005)" y "Vistas del timeline" en Stack y estructura.

Todavía sin definir:

- Nada pendiente de fase conocido a día de hoy (2026-08-25). Posible seguimiento futuro (no pedido explícitamente todavía): si Avengers: Doomsday revela más personajes o películas de X-Men relevantes al estrenarse (18 de diciembre de 2026), puede hacer falta ampliar el catálogo de Earth-10005 o ajustar la lista de Countdown to Doomsday.

## Convenciones heredadas

Aplican todas las reglas globales del usuario definidas en `~/.claude/CLAUDE.md` (estilo de escritura sin guion largo/medio, sin Title Case indebido en español, formato APA 7 por defecto en documentos de entrega, entre otras). No se repiten aquí para evitar duplicación; ese archivo es la fuente de verdad para esas reglas y siempre está vigente.
