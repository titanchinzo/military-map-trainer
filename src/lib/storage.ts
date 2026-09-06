import type { PlacedSymbol } from "@/types/symbol";
import type { PlacedLine } from "@/types/line";

function key(userId: string) {
  return `mmt:placements:${userId}`;
}

function linesKey(userId: string) {
  return `mmt:lines:${userId}`;
}

export function loadPlacements(userId: string): PlacedSymbol[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlacements(userId: string, placements: PlacedSymbol[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(placements));
  } catch {
    // localStorage full or unavailable (private mode) — training data just
    // won't persist across reloads; not worth surfacing an error for.
  }
}

export function loadLines(userId: string): PlacedLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(linesKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLines(userId: string, lines: PlacedLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(linesKey(userId), JSON.stringify(lines));
  } catch {
    // see savePlacements
  }
}
