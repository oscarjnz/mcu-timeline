"use client";

import Image from "next/image";
import type { TimelineEntry } from "@/types/timeline";
import { useLanguage } from "@/lib/language-context";
import { phaseColors } from "@/lib/phase-colors";
import { getPosterUrl } from "@/lib/tmdb";
import { getRatings } from "@/lib/ratings";
import { getProviders } from "@/lib/providers";

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
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{justification}</p>

        {ratings && (ratings.imdbRating || ratings.rottenTomatoes || ratings.tmdbScore !== null) && (
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
        )}

        {(providers.us.length > 0 || providers.do.length > 0) && (
          <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <WatchProviderRow
              label={
                providers.sameInBothRegions
                  ? language === "es"
                    ? "Disponible en"
                    : "Available on"
                  : "US"
              }
              providers={providers.us}
            />
            {!providers.sameInBothRegions && <WatchProviderRow label="DO" providers={providers.do} />}
          </div>
        )}
      </div>
    </article>
  );
}

function WatchProviderRow({ label, providers }: { label: string; providers: { name: string; logoUrl: string | null }[] }) {
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
            <Image
              src={provider.logoUrl}
              alt=""
              width={14}
              height={14}
              className="rounded-sm"
            />
          )}
          {provider.name}
        </span>
      ))}
    </div>
  );
}
