import type { PassageInfo, SplitGroup } from "../types";

let autoId = 1000;

export function groupByTag(passages: PassageInfo[]): SplitGroup[] {
  const tagMap = new Map<string, string[]>();

  for (const p of passages) {
    if (p.name === "StoryData" || p.name === "StoryTitle") continue;

    const tag = p.tags?.split(" ")[0] || "untagged";
    if (!tagMap.has(tag)) tagMap.set(tag, []);
    tagMap.get(tag)!.push(p.name);
  }

  return Array.from(tagMap.entries()).map(([tag, names]) => ({
    id: String(autoId++),
    filename: `${tag}.twee`,
    passageNames: names,
  }));
}
