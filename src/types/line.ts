import type { AffiliationColor, Echelon } from "@/types/symbol";

/**
 * §2.8 (Хязгаарлах шугам) and §2.9 (Район, зааг, байр, цэг) of Т4-2022 are
 * lines/areas drawn across the map rather than a single point icon, so they
 * need a different data model from SymbolDef/PlacedSymbol.
 */
export type LineKind =
  | "boundary" // §2.8 — echelon-parameterized boundary line
  | "missionLine" // §2.9 — bracketed "ойрын/дараагийн үүрэг" line
  | "strikeDirection" // §2.9 — arrow-terminated direction of attack/strike
  | "plainLine" // §2.9 — a labeled line with no special terminator
  | "area"; // §2.9 — closed freeform zone/район

export interface LineTypeDef {
  id: string;
  kind: LineKind;
  mn: string;
  desc: string;
  ref: string;
  dashed?: boolean;
}

/** A boundary/mission-line/direction/area the trainee has drawn on the map. */
export interface PlacedLine {
  uid: string;
  typeId: string;
  /** [lat, lng] vertices, in drawing order. */
  points: [number, number][];
  /** Only meaningful for kind "boundary" — which echelon's boundary this is. */
  echelon?: Echelon;
  affiliation?: AffiliationColor;
  label?: string;
  createdAt: number;
}
