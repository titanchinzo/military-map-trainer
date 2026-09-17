import type { PlacedSymbol } from "@/types/symbol";
import type { PlacedLine } from "@/types/line";
import type { Board, BoardView } from "@/types/db";

/** Газрын зургийн агуулга — DB-ийн мөрөөс тусгаарласан хэлбэр. */
export interface BoardState {
  placements: PlacedSymbol[];
  lines: PlacedLine[];
  view: BoardView | null;
}

export const EMPTY_BOARD: BoardState = { placements: [], lines: [], view: null };

/** DB-ээс ирсэн мөрийг найдвартай хөрвүүлнэ (jsonb нь юу ч байж болно). */
export function boardFromRow(row: Partial<Board> | null | undefined): BoardState {
  if (!row) return EMPTY_BOARD;
  const view = row.view;
  return {
    placements: Array.isArray(row.placements) ? row.placements : [],
    lines: Array.isArray(row.lines) ? row.lines : [],
    view:
      view &&
      typeof view === "object" &&
      typeof view.lat === "number" &&
      typeof view.lng === "number" &&
      typeof view.zoom === "number"
        ? { lat: view.lat, lng: view.lng, zoom: view.zoom }
        : null,
  };
}

export function isEmptyBoard(board: BoardState): boolean {
  return board.placements.length === 0 && board.lines.length === 0;
}
