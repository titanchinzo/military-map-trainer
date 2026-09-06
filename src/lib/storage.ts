import type { PlacedSymbol } from "@/types/symbol";

function key(userId: string) {
  return `mmt:placements:${userId}`;
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
