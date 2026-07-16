# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

A día de hoy (2026-07-16), el proyecto es un sitio web (MCU Timeline) que presenta el orden cronológico y narrativo completo del universo cinematográfico de Marvel, en español (principal) e inglés (toggle), basado en notas de un foro de Reddit que corrigen el timeline oficial. Repositorio git inicializado con `create-next-app`. Stack: Next.js (App Router) + TypeScript + Tailwind CSS.

Fuente de contenido y decisiones de estructura documentadas en la memoria persistente del agente (`[[proyecto-web-mcu-timeline]]`, `[[mcu-timeline-datos-fuente]]`, `[[mcu-timeline-estructura-fases]]`), no en este repositorio, para evitar duplicar el texto largo aquí.

## Stack y estructura

- **Framework:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, ESLint.
- **Idiomas:** toggle ES/EN en la misma página (sin rutas separadas), español por defecto.
- **Datos:** catálogo propio de ~90 entradas (películas, series, one-shots, specials) en un archivo de datos tipado dentro de `src/`, cada una con título ES/EN, fase (1-6), tipo, fecha/año in-universe, justificación cronológica ES/EN, y referencia a TMDB para poster/metadata.
- **API externa:** TMDB (The Movie Database) para posters y metadata verificada. Credenciales en `.env.local` (excluido de git via `.gitignore`, patrón `.env*`). Resolución de posters pensada para build time, no llamadas cliente con la key expuesta.
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

(aún no se ha registrado ningún error)

Formato para cada entrada nueva:

- **Fecha:**
- **Qué pasó:**
- **Causa raíz:**
- **Regla derivada para evitarlo:**

## Decisiones pendientes

Ya resueltas: de qué trata el proyecto, stack técnico, cómo correrlo y cómo testearlo (ver secciones de arriba).

Todavía sin definir:

- Estructura de carpetas detallada dentro de `src/` (a definir en la Fase 1-3 del plan, cuando se creen los datos y componentes).
- Datos finales de Avengers: Doomsday (2026) y Avengers: Secret Wars (2027), pendientes de investigar y confirmar antes de cargarlos al catálogo.

## Convenciones heredadas

Aplican todas las reglas globales del usuario definidas en `~/.claude/CLAUDE.md` (estilo de escritura sin guion largo/medio, sin Title Case indebido en español, formato APA 7 por defecto en documentos de entrega, entre otras). No se repiten aquí para evitar duplicación; ese archivo es la fuente de verdad para esas reglas y siempre está vigente.
