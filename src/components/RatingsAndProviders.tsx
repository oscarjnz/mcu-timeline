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
