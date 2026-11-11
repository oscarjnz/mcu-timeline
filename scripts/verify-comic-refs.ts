// Verifica que cada `sourceUrl` de src/data/comic-references.ts apunte a una
// ficha existente de la Marvel Database (marvel.fandom.com). Uso:
//   npx tsx scripts/verify-comic-refs.ts
import { comicReferences } from "../src/data/comic-references";

const PREFIX = "https://marvel.fandom.com/wiki/";

async function main() {
  const pages = new Set<string>();
  for (const refs of Object.values(comicReferences)) {
    for (const ref of refs) {
      if (ref.sourceUrl?.startsWith(PREFIX)) pages.add(decodeURIComponent(ref.sourceUrl.slice(PREFIX.length)).replace(/_/g, " "));
    }
  }
  const list = [...pages];
  const missing: string[] = [];
  for (let i = 0; i < list.length; i += 40) {
    const chunk = list.slice(i, i + 40);
    const url = `https://marvel.fandom.com/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(chunk.join("|"))}`;
    const res = await fetch(url, { headers: { "User-Agent": "mcu-timeline-verify/1.0" } });
    const data = (await res.json()) as {
      query: { pages: Record<string, { title: string; missing?: string }>; normalized?: { from: string; to: string }[] };
    };
    const normalized = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of Object.values(data.query.pages)) {
      if (page.missing !== undefined) missing.push(normalized.get(page.title) ?? page.title);
    }
  }
  console.log(`Fichas revisadas: ${list.length}. Faltantes: ${missing.length}.`);
  for (const m of missing) console.log(`  FALTA: ${m}`);
  if (missing.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
