import type { PassageInfo } from "../types";
import type { PassageLink } from "./parseLinks";

interface Position {
  x: number;
  y: number;
}

const GAP_X = 220;
const GAP_Y = 120;

/**
 * Use original Twine positions when available.
 * Place unpositioned passages in nearby empty grid slots.
 */
export function computePositions(
  passages: PassageInfo[],
  _links: PassageLink[]
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const unpositioned: string[] = [];

  // 1. Parse existing positions
  for (const p of passages) {
    if (p.position) {
      const parts = p.position.split(",").map(Number);
      if (parts.length === 2 && parts.every((n) => !isNaN(n))) {
        positions.set(p.name, { x: parts[0], y: parts[1] });
        continue;
      }
    }
    unpositioned.push(p.name);
  }

  if (unpositioned.length === 0) return positions;

  // 2. All unpositioned — grid layout
  if (positions.size === 0) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(unpositioned.length)));
    for (let i = 0; i < unpositioned.length; i++) {
      positions.set(unpositioned[i], {
        x: (i % cols) * GAP_X,
        y: Math.floor(i / cols) * GAP_Y,
      });
    }
    return positions;
  }

  // 3. Some have positions — find empty slots near existing nodes
  const occupied = new Set<string>();
  for (const pos of positions.values()) {
    occupied.add(slotKey(pos));
  }

  // Center of all positioned nodes as anchor
  let cx = 0, cy = 0;
  for (const pos of positions.values()) {
    cx += pos.x;
    cy += pos.y;
  }
  cx /= positions.size;
  cy /= positions.size;

  // Spiral outward from center to find empty grid slots
  for (const name of unpositioned) {
    const slot = findEmptySlot(cx, cy, occupied);
    positions.set(name, slot);
    occupied.add(slotKey(slot));
  }

  return positions;
}

function slotKey(pos: Position): string {
  const gx = Math.round(pos.x / GAP_X);
  const gy = Math.round(pos.y / GAP_Y);
  return `${gx},${gy}`;
}

function findEmptySlot(
  cx: number,
  cy: number,
  occupied: Set<string>
): Position {
  const gx0 = Math.round(cx / GAP_X);
  const gy0 = Math.round(cy / GAP_Y);

  // Spiral search
  for (let r = 1; r < 50; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const key = `${gx0 + dx},${gy0 + dy}`;
        if (!occupied.has(key)) {
          return { x: (gx0 + dx) * GAP_X, y: (gy0 + dy) * GAP_Y };
        }
      }
    }
  }
  return { x: cx, y: cy + GAP_Y };
}
