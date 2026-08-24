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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4"
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
