import providersCache from "@/data/providers-cache.json";
import providersOverrides from "@/data/providers-overrides.json";

const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/original";

export interface Provider {
  name: string;
  logoUrl: string | null;
}

interface RegionProviders {
  US: { name: string; logoPath: string | null }[];
  DO: { name: string; logoPath: string | null }[];
}

const baseCache = providersCache as Record<string, RegionProviders>;
const overrides = providersOverrides as unknown as Record<string, Partial<RegionProviders>>;

// Aplica las correcciones manuales de providers-overrides.json encima del cache
// de TMDB: agrega los proveedores que falten en cada region, sin duplicar.
function withOverrides(id: string): RegionProviders | undefined {
  const base = baseCache[id];
  const extra = overrides[id];
  if (!extra) return base;
  const merged: RegionProviders = { US: [...(base?.US ?? [])], DO: [...(base?.DO ?? [])] };
  for (const region of ["US", "DO"] as const) {
    for (const provider of extra[region] ?? []) {
      if (!merged[region].some((p) => p.name === provider.name)) merged[region].unshift(provider);
    }
  }
  return merged;
}

// US y DO casi siempre coinciden en MCU (Disney+ es global), pero cuando difieren
// se muestran ambas regiones por separado en vez de fusionarlas.
export function getProviders(id: string): { us: Provider[]; do: Provider[]; sameInBothRegions: boolean } {
  const entry = withOverrides(id);
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
