# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

A día de hoy (2026-07-16), el proyecto es un sitio web (MCU Timeline) que presenta el orden cronológico y narrativo completo del universo cinematográfico de Marvel, en español (principal) e inglés (toggle), basado en notas de un foro de Reddit que corrigen el timeline oficial. Repositorio git inicializado con `create-next-app`. Stack: Next.js (App Router) + TypeScript + Tailwind CSS.

Fuente de contenido y decisiones de estructura documentadas en la memoria persistente del agente (`[[proyecto-web-mcu-timeline]]`, `[[mcu-timeline-datos-fuente]]`, `[[mcu-timeline-estructura-fases]]`), no en este repositorio, para evitar duplicar el texto largo aquí.

## Stack y estructura

- **Framework:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, ESLint.
- **Idiomas:** toggle ES/EN en la misma página (sin rutas separadas), español por defecto.
- **Datos:** catálogo propio de ~90 entradas (películas, series, one-shots, specials) en un archivo de datos tipado dentro de `src/`, cada una con título ES/EN, fase (1-6), tipo, fecha/año in-universe, justificación cronológica ES/EN, y referencia a TMDB para poster/metadata.
- **API externa:** TMDB (The Movie Database) para posters, metadata verificada y disponibilidad de streaming (`watch/providers`, regiones US y DO). Credenciales en `.env.local` (excluido de git via `.gitignore`, patrón `.env*`). Resolución de posters pensada para build time, no llamadas cliente con la key expuesta.
- **Puntuaciones:** rating de TMDB siempre disponible (no requiere key adicional). IMDb y Rotten Tomatoes vía OMDb API (`OMDB_API_KEY` opcional en `.env.local`); si no está seteada, esos dos campos simplemente quedan vacíos y solo se muestra TMDB. El usuario intentó sacar una key en omdbapi.com y le dio error de servidor al registrarse; la API en sí funciona (verificado), así que es un problema puntual del registro (probable con emails Yahoo/Hotmail/Outlook/Live, según la propia doc de OMDb) que puede reintentar más tarde.
- **Scripts de build de datos** (`scripts/`, se corren manualmente con `npx tsx scripts/<nombre>.ts` tras editar `timeline.ts`): `fetch-tmdb.ts` (posters/backdrops → `src/data/tmdb-cache.json`), `fetch-providers.ts` (streaming → `src/data/providers-cache.json`), `fetch-ratings.ts` (ratings → `src/data/ratings-cache.json`). Los tres se basan en `tmdbSearchTitle`/`tmdbMediaType`/`tmdbYear` de cada entrada.
- **Extranjerismos:** términos que son nombres propios de saga/equipo tomados directamente de Marvel (`The Avengers`, `The Defenders`, `Disassembled`) se dejan sin traducir en ambos idiomas, en cualquier lugar donde aparezcan (nombre de fase, título de película, justificación), por decisión explícita del usuario. No traducir a "Vengadores"/"Defensores"/"Desarmados" aunque exista una traducción oficial de doblaje.
- **Títulos de entregas (regla estricta, sin excepción):** `titleEs` de cada entrada en `timeline.ts` debe ser idéntico a `titleEn`, siempre el nombre original en inglés. Nunca usar el título doblado/traducido al español (ni "Capitana Marvel", ni "El Increíble Hulk", ni "Guardianes de la Galaxia", etc.), tanto en el campo `titleEs` como en cualquier mención cruzada dentro de `justificationEs` de otra entrada. Solo el resto del texto (justificación, `dateLabel`, tipo, badges de fase) se traduce; el nombre propio de la obra no.
- **Fecha in-universe vs. fecha real de estreno:** `dateLabel` es la ubicación de la historia dentro de la cronología narrativa (ej. Avengers: Endgame = "2023" porque la trama salta 5 años tras el chasquido), no el año en que se estrenó en el mundo real (Endgame se estrenó en 2019). Son dos ejes distintos a propósito: el sitio existe precisamente para reordenar el catálogo por fecha narrativa en vez de por fecha de estreno. Para que no se lea como un error de dato, cada tarjeta muestra ambas: el `dateLabel` in-universe y, entre paréntesis, "(estreno: AÑO)" con el año real, calculado en build time por `scripts/fetch-tmdb.ts` (`releaseYear` en `tmdb-cache.json`, expuesto por `getReleaseYear` en `src/lib/tmdb.ts`). Para series con temporadas partidas en varias entradas del timeline (ej. Agents of S.H.I.E.L.D.), el año de estreno se resuelve por temporada específica (parseando "Season N" del título y pidiendo `/tv/{id}/season/{n}` a TMDB), no el de la temporada 1 del show completo.
- **Layout:** timeline vertical continuo, agrupado y coloreado por fase, con navegación sticky por fase y filtros por tipo/fase.

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

Formato para cada entrada nueva:

- **Fecha:**
- **Qué pasó:**
- **Causa raíz:**
- **Regla derivada para evitarlo:**

## Decisiones pendientes

Ya resueltas: de qué trata el proyecto, stack técnico, cómo correrlo y cómo testearlo (ver secciones de arriba).

Ya resueltas también: estructura de carpetas (`src/data` para datos y cache TMDB, `src/lib` para utilidades y contexto, `src/components` para UI, `src/types` para tipos), y datos de Avengers: Doomsday (2026) y Avengers: Secret Wars (2027) ya cargados en `src/data/timeline.ts` dentro de la Fase 6 "DOOM".

Todavía sin definir:

- Nada pendiente de fase conocido a día de hoy (2026-07-16). Fase 1 (modelo de datos), Fase 2 (integración TMDB), Fase 3 (UI: timeline vertical, nav por fase, filtros, toggle de idioma) y una pasada de pulido de UI/UX (indicador de fase activa al hacer scroll con IntersectionObserver, scroll suave, scrollbar oculto en la nav de fases, hover con sombra en las tarjetas) ya están implementadas y verificadas en navegador (desktop y mobile 390x844).

## Convenciones heredadas

Aplican todas las reglas globales del usuario definidas en `~/.claude/CLAUDE.md` (estilo de escritura sin guion largo/medio, sin Title Case indebido en español, formato APA 7 por defecto en documentos de entrega, entre otras). No se repiten aquí para evitar duplicación; ese archivo es la fuente de verdad para esas reglas y siempre está vigente.
