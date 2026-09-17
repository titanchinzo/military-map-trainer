import type { AffiliationColor, Echelon, FrameShape, SymbolDef } from "@/types/symbol";
import { AFFILIATION_HEX } from "@/lib/colors";

/**
 * Builds a self-contained SVG for a symbol definition. Used both for palette
 * thumbnails and for Leaflet `divIcon` markers, so the two always match.
 *
 * Sizing follows Т4-2022 §1.8 Хүснэгт 3: a unit frame's width on paper is set
 * by its echelon (at 1:50 000 — хороо 20×10 mm, батальон 16×8, рот 14×7; the
 * table's 1:100 000 column fixes бригад/дивиз/арми above хороо, and §1.8.2
 * has anything below рот shrink in proportion), and every frame is twice as
 * wide as it is tall. `MM_PX` converts those paper millimetres to screen
 * pixels; sizes do not change with map zoom, exactly as they don't with map
 * scale on paper.
 */
const MM_PX = 3.0;

/** Frame width in paper millimetres per echelon (§1.8 Хүснэгт 3, extended
 * two steps below рот and above бригад per §1.8.2). */
export const ECHELON_MM: Record<Echelon, number> = {
  XXXX: 28,
  XXX: 26,
  XX: 24,
  X: 22,
  III: 20,
  II: 16,
  I: 14,
  c: 12,
  т: 10,
  бү: 8,
};
/** Frames with no echelon (installations, posts, single objects). */
const DEFAULT_MM = 12;
/** Free-standing weapon/vehicle glyphs (no frame) are drawn in a 32-unit box. */
const GLYPH_PX = 32;
const PAD = 4;
const ECHELON_ROW = 12;

/** §1.4.1 — салаа/тасаг/бүлэг write their echelon letter *inside* the
 * frame; everything from рот upward puts the mark above it. */
const INSIDE_ECHELONS: ReadonlySet<Echelon> = new Set(["c", "т", "бү"]);

export interface RenderedSymbol {
  svg: string;
  /** Canvas size in px (designation text may overflow to the right). */
  width: number;
  height: number;
  /** The point on the canvas that sits on the map coordinate: the frame's
   * centre, or a flag's staff foot for command posts. */
  anchorX: number;
  anchorY: number;
}

export interface RenderOptions {
  colorOverride?: AffiliationColor;
  /** A branch-of-service glyph (another SymbolDef's `glyph`) drawn inside
   * this symbol's frame — lets a generic unit box be marked as a specific
   * branch (e.g. "Уулын"). */
  centerGlyph?: string;
  /** Харьяаллын дугаар / нэр (§1.6), written along the frame's lower line
   * in black. Map markers pass this; palette thumbnails leave it out. */
  designation?: string;
}

export function renderSymbol(def: SymbolDef, opts: RenderOptions = {}): RenderedSymbol {
  const color = opts.colorOverride ?? def.color;
  const stroke = AFFILIATION_HEX[color];
  const isHostile = color === "hostile";
  // §1.5 — the enemy's units, formations and elements take a hexagon frame.
  const frame: FrameShape = isHostile && isUnitFrame(def.frame) ? "hexagon" : def.frame;

  const effectiveCenterGlyph = opts.centerGlyph ?? def.centerGlyph;
  // A transcribed glyph is the whole symbol (the manual draws branch, weapon
  // and vehicle icons as free-standing line art); a frame is only drawn when
  // there is no glyph, or when a branch glyph is placed *inside* a unit box.
  const isBareGlyph = !!def.glyph && !effectiveCenterGlyph;

  const echelonInside = def.echelon ? INSIDE_ECHELONS.has(def.echelon) : false;
  const echelonAbove = !!def.echelon && !echelonInside;
  const box = isBareGlyph ? { w: GLYPH_PX, h: GLYPH_PX } : frameBox(frame, def);

  const top = PAD + (echelonAbove ? ECHELON_ROW : 0);
  const left = PAD;
  const cx = left + box.w / 2;
  const cy = top + box.h / 2;
  const poleLen = frame === "flag" ? box.h * 1.2 : 0;
  const width = box.w + PAD * 2;
  const height = top + box.h + PAD + poleLen;

  const parts: string[] = [];

  if (echelonAbove) {
    const fs = Math.min(12, Math.max(9, box.h * 0.5));
    parts.push(
      `<text x="${cx}" y="${top - 2}" text-anchor="middle" font-family="monospace" font-weight="700" font-size="${fs}" fill="${stroke}">${escapeXml(def.echelon!)}</text>`,
    );
  }

  if (isBareGlyph) {
    // Free-standing line art (weapons, vehicles, aircraft, branch icons).
    const scale = box.w / 32;
    parts.push(
      `<g transform="translate(${left},${top}) scale(${scale})" color="${stroke}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${def.glyph}</g>`,
    );
  } else {
    parts.push(renderShape(frame, left, top, box.w, box.h, stroke, poleLen));

    // §1.4.1 / §1.3.3 — the subunit letter sits inside the frame, sharing it
    // with the branch glyph when there is one (letter left, glyph right).
    const insideLabel = echelonInside ? def.echelon! : def.label;
    const labelX = echelonInside && effectiveCenterGlyph ? left + box.w * 0.34 : cx;
    const glyphCx = echelonInside && effectiveCenterGlyph ? left + box.w * 0.66 : cx;

    if (effectiveCenterGlyph) {
      const inner = Math.min(box.w, box.h) * (echelonInside ? 0.8 : 0.78);
      const s = inner / 32;
      parts.push(
        `<g transform="translate(${glyphCx - 16 * s},${cy - 16 * s}) scale(${s})" color="${stroke}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${effectiveCenterGlyph}</g>`,
      );
    }
    if (insideLabel && (echelonInside || !effectiveCenterGlyph)) {
      const maxW = echelonInside && effectiveCenterGlyph ? box.w * 0.3 : box.w * 0.86;
      const fs = labelFontSize(insideLabel, maxW, box.h);
      // A frameless label (point/arrow) sits straight on the map tiles, so it
      // gets a white halo to stay readable; one inside a filled frame does not.
      const halo = frame === "point" || frame === "arrow" ? 3 : 0;
      parts.push(
        `<text x="${labelX}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-weight="700" font-size="${fs}" fill="${stroke}" style="paint-order: stroke; stroke: white; stroke-width: ${halo}px;">${escapeXml(insideLabel)}</text>`,
      );
    }
  }

  // §1.6.2 — the designation goes along the symbol's lower line, on the side
  // opposite the direction of operations; §1.2 fixes its colour as black.
  const designation = opts.designation?.trim();
  if (designation) {
    const fs = Math.max(9, Math.min(13, box.h * 0.5));
    parts.push(
      `<text x="${left + box.w + 3}" y="${top + box.h}" text-anchor="start" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${fs}" fill="#111111" style="paint-order: stroke; stroke: white; stroke-width: 3px;">${escapeXml(designation)}</text>`,
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="visible">${parts.join("")}</svg>`;
  return {
    svg,
    width,
    height,
    anchorX: frame === "flag" ? left : cx,
    anchorY: frame === "flag" ? top + box.h + poleLen : cy,
  };
}

/** Backwards-compatible string form. */
export function renderSymbolSvg(def: SymbolDef, opts: RenderOptions = {}): string {
  return renderSymbol(def, opts).svg;
}

/** Palette thumbnail: the intrinsic drawing scaled down (never up) to fit a
 * `maxPx` box, so relative sizes stay visible between echelons. */
export function symbolDataUri(def: SymbolDef, maxPx = 40): string {
  const r = renderSymbol(def);
  const scale = Math.min(1, maxPx / Math.max(r.width, r.height));
  const w = Math.round(r.width * scale);
  const h = Math.round(r.height * scale);
  const svg = r.svg.replace(/^<svg([^>]*) width="[^"]*" height="[^"]*"/, `<svg$1 width="${w}" height="${h}"`);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isUnitFrame(frame: FrameShape) {
  return frame === "rect" || frame === "square" || frame === "circle" || frame === "yatsbm";
}

/** Frame width/height in px from the echelon (or default) size class. */
function frameBox(frame: FrameShape, def: SymbolDef): { w: number; h: number } {
  // §1.8.1 — the brigade box is the base size; the top-level headquarters
  // flags (ЗХЖШ, командлалууд) carry no echelon mark and take that base.
  const mm = def.echelon ? ECHELON_MM[def.echelon] : frame === "flag" ? ECHELON_MM.X : DEFAULT_MM;
  const w = mm * MM_PX;
  switch (frame) {
    case "rect":
    case "flag":
    case "yatsbm":
    case "ellipse":
    case "hexagon":
    case "diamond":
      return { w, h: w / 2 };
    case "square": {
      const s = w * 0.6;
      return { w: s, h: s };
    }
    case "triangle":
      return { w: w * 0.7, h: w * 0.62 };
    case "circle": {
      const d = w * 0.6;
      return { w: d, h: d };
    }
    case "arrow":
      return { w: w * 0.8, h: w * 0.5 };
    case "point":
    default:
      return def.glyph ? { w: GLYPH_PX, h: GLYPH_PX } : { w: 10, h: 10 };
  }
}

function renderShape(
  frame: FrameShape,
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string,
  poleLen: number,
) {
  const fill = "rgba(255,255,255,0.92)";
  const sw = 2.2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const poly = (pts: number[][]) =>
    `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  switch (frame) {
    case "rect":
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    // §2.1 — command posts are a flag: the frame with a staff dropping from
    // its left corner; the staff's foot marks the post's position.
    case "flag":
      return (
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<line x1="${x}" y1="${y + h}" x2="${x}" y2="${y + h + poleLen}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`
      );
    // §1.3.3 / §2.3 — a subunit is drawn as its principal vehicle's outline
    // (the ЯЦБМ pentagon, nose towards the front) with the letter inside.
    case "yatsbm":
      return poly([
        [x + w * 0.28, y],
        [x + w, y],
        [x + w, y + h],
        [x + w * 0.28, y + h],
        [x, cy],
      ]);
    case "square":
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case "triangle":
      return poly([
        [cx, y],
        [x + w, y + h],
        [x, y + h],
      ]);
    case "circle":
      return `<circle cx="${cx}" cy="${cy}" r="${w / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case "ellipse":
      return `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case "diamond":
      return poly([
        [cx, y],
        [x + w, cy],
        [cx, y + h],
        [x, cy],
      ]);
    case "hexagon":
      return poly([
        [x, cy],
        [x + w * 0.25, y],
        [x + w * 0.75, y],
        [x + w, cy],
        [x + w * 0.75, y + h],
        [x + w * 0.25, y + h],
      ]);
    case "arrow": {
      const r = h / 2;
      return `<path d="M ${x} ${cy + r * 0.5} L ${x + w * 0.6} ${cy + r * 0.5} L ${x + w * 0.6} ${y + h} L ${x + w} ${cy} L ${x + w * 0.6} ${y} L ${x + w * 0.6} ${cy - r * 0.5} L ${x} ${cy - r * 0.5} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    }
    case "point":
    default:
      return `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${stroke}" stroke="white" stroke-width="1"/>`;
  }
}

function labelFontSize(label: string, maxW: number, h: number) {
  const len = Math.max(label.length, 1);
  const byWidth = maxW / (len * 0.62);
  return Math.max(7, Math.min(h * 0.62, byWidth, 14));
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
