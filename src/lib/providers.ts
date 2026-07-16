import providersCache from "@/data/providers-cache.json";

const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/original";

export interface Provider {
  name: string;
  logoUrl: string | null;
}

interface RegionProviders {
  US: { name: string; logoPath: string | null }[];
  DO: { name: string; logoPath: string | null }[];
}

const cache = providersCache as Record<string, RegionProviders>;

// US y DO casi siempre coinciden en MCU (Disney+ es global), pero cuando difieren
// se muestran ambas regiones por separado en vez de fusionarlas.
export function getProviders(id: string): { us: Provider[]; do: Provider[]; sameInBothRegions: boolean } {
  const entry = cache[id];
  if (!entry) return { us: [], do: [], sameInBothRegions: true };

  const toProviders = (list: { name: string; logoPath: string | null }[]): Provider[] =>
    list.map((p) => ({
      name: p.name,
      logoUrl: p.logoPath ? `${TMDB_LOGO_BASE}${p.logoPath}` : null,
    }));

  const us = toProviders(entry.US ?? []);
  const doList = toProviders(entry.DO ?? []);
  const sameInBothRegions =
    us.map((p) => p.name).sort().join(",") === doList.map((p) => p.name).sort().join(",");

  return { us, do: doList, sameInBothRegions };
}
