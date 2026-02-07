import type { PassageInfo } from "../types";

export interface PassageLink {
  source: string;
  target: string;
}

/**
 * Parse SugarCube links from passage content.
 * Supports:
 *   [[passageName]]
 *   [[display text|passageName]]
 *   [[display text->passageName]]
 */
export function parseLinks(passages: PassageInfo[]): PassageLink[] {
  const names = new Set(passages.map((p) => p.name));
  const links: PassageLink[] = [];
  const seen = new Set<string>();

  const re = /\[\[([^\]]+)\]\]/g;

  for (const p of passages) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;

    while ((m = re.exec(p.content)) !== null) {
      const inner = m[1];
      let target: string;

      if (inner.includes("|")) {
        target = inner.split("|").pop()!.trim();
      } else if (inner.includes("->")) {
        target = inner.split("->").pop()!.trim();
      } else if (inner.includes("<-")) {
        target = inner.split("<-")[0].trim();
      } else {
        target = inner.trim();
      }

      if (names.has(target)) {
        const key = `${p.name}→${target}`;
        if (!seen.has(key)) {
          seen.add(key);
          links.push({ source: p.name, target });
        }
      }
    }
  }

  return links;
}
