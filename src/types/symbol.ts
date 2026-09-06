/**
 * Data model for a tactical symbol as specified by "Цэргийн тактикийн таних
 * тэмдэг, тэмдэглэгээг хэрэглэх заавар Т4-2022" (ЗХЖШ, 2022).
 *
 * The frame shape / echelon marks / affiliation colors below are reproduced
 * exactly from the manual's tables (§1.4–§1.7). Where the manual's icon is a
 * literal lettered box (e.g. "ЗХЖШ", "ХЗЦК"), that exact label is used. Where
 * the manual shows a hand-drawn pictorial glyph that isn't recoverable from
 * the PDF's text layer (most branch-of-service / weapon icons in Ch.2 and
 * the appendices), a short Mongolian abbreviation stands in for it inside the
 * correctly-shaped, correctly-colored, correctly-echeloned frame — see
 * `glyph === "text"`. Those are marked `approximate: true` and say so in the
 * tooltip, so the tool never presents an invented glyph as authoritative.
 */

export type FrameShape =
  | "rect" // тэгш өнцөгт — udирдлага/анги/салбар
  | "square" // дөрвөлжин — бааз, агуулах, объект
  | "triangle" // адил хажуут гурвалжин — хяналт/хангалтын байр
  | "circle" // дугуй — байр, байгууламж, артиллери/зенит/явган цэргийн салаа
  | "hexagon" // эсрэг талын анги/салбар/нэгж
  | "diamond" // танк төрлийн техник
  | "ellipse" // холимог мотобуудлагын салбар
  | "arrow" // ажиллагаа/хөдөлгөөний тэмдэг
  | "point"; // хүрээгүй бэлгэдэл (зэвсэг, дан branch-глиф)

export type AffiliationColor =
  | "friendly" // хөх — өөрийн цэрэг
  | "hostile" // улаан — эсрэг тал
  | "black" // хар — артиллери/АДХЦ/инженер/ЦХБ/техник/удирдлага гэх мэт
  | "green" // ногоон — хилийн цэрэг / хуурамч
  | "brown" // хүрэн — орон нутгийн цэрэг
  | "tan" // бор — зам/маршрут, цагдаа, дотоодын цэрэг
  | "yellow" // шар — ЦХБ хордолт
  | "orange"; // улбар шар — онцгой байдал

export type Echelon =
  | "XXXX"
  | "XXX"
  | "XX"
  | "X"
  | "III"
  | "II"
  | "I"
  | "c"
  | "т"
  | "бү";

export interface SymbolDef {
  /** Stable unique id, also used as the palette drag payload. */
  id: string;
  /** Palette grouping. */
  category: string;
  /** Full Mongolian name as given in the manual — shown as the tooltip title. */
  mn: string;
  /** Short label rendered inside the glyph frame (kept to ~6 chars). */
  label: string;
  frame: FrameShape;
  color: AffiliationColor;
  echelon?: Echelon;
  /** 1–3 sentence description, drawn from the manual's text for that entry. */
  desc: string;
  /** Section reference inside Т4-2022 / БД-2/100, e.g. "Т4-2022 §2.1". */
  ref: string;
  /** True when `label` is a stand-in abbreviation rather than the manual's literal icon/text. */
  approximate?: boolean;
  /**
   * A precise bare-line-art glyph transcribed directly from the manual's
   * figure (used for §2.4–§2.10 branch/weapon/vehicle/aircraft icons, which
   * the manual draws as free-standing line art rather than inside a
   * frame+label box). Raw SVG markup in a 32×32 local coordinate space
   * centered at (16,16); rendered with currentColor stroke, no fill, in
   * place of the frame+label rendering. See renderSymbol.ts.
   */
  glyph?: string;
  /**
   * Default branch-of-service glyph drawn inside this symbol's frame (in
   * place of its text label) for unit boxes like "Батальон" — e.g. the
   * infantry-fighting-vehicle glyph for "Бригад (явган цэргийн байлдааны
   * машинтай)". A placement's `branchGlyphId` (see PlacedSymbol) overrides
   * this per-instance. Raw SVG, same coordinate space as `glyph`.
   */
  centerGlyph?: string;
}

/** A symbol instance the trainee has dropped onto the map. */
export interface PlacedSymbol {
  uid: string;
  symbolId: string;
  lat: number;
  lng: number;
  /** Optional unit/harьяаллын dугаар the trainee can label the marker with. */
  designation?: string;
  /** Overrides the symbol definition's default color for this placement,
   * so e.g. the same unit icon can be dropped as either friendly or hostile. */
  affiliation?: AffiliationColor;
  /** Id of a "Төрөл, мэргэжлийн цэрэг" (§2.4) SymbolDef whose glyph should be
   * drawn inside this unit box, so e.g. a generic "Батальон" can be marked
   * as specifically "Уулын" (mountain), "Танк" (tank), etc. */
  branchGlyphId?: string;
  elevation?: number | null;
  elevationError?: string;
  createdAt: number;
}
