import type { AffiliationColor, SymbolDef } from "@/types/symbol";
import { AFFILIATION_HEX } from "@/lib/colors";

/**
 * Builds a self-contained SVG markup string for a symbol definition. Used
 * both for palette thumbnails (as `dangerouslySetInnerHTML`) and for Leaflet
 * `divIcon` markers on the map, so the two always render identically.
 */
export function renderSymbolSvg(
  def: SymbolDef,
  opts: {
    size?: number;
    selected?: boolean;
    colorOverride?: AffiliationColor;
  } = {},
): string {
  const size = opts.size ?? 48;
  const color = opts.colorOverride ?? def.color;
  const stroke = AFFILIATION_HEX[color];
  const isHostile = color === "hostile";
  const frame = isHostile && isUnitFrame(def.frame) ? "hexagon" : def.frame;

  const cx = size / 2;
  const cy = size / 2 + (def.echelon ? 6 : 0);
  const w = size - 8;
  const h = frame === "rect" || frame === "ellipse" ? size * 0.56 : size - 14;

  const fontSize = labelFontSize(def.label, w);
  const selectionRing = opts.selected
    ? `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="8" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 3"/>`
    : "";

  const echelonMark = def.echelon
    ? `<text x="${cx}" y="${cy - h / 2 - 5}" text-anchor="middle" font-family="monospace" font-weight="700" font-size="${Math.max(9, size * 0.2)}" fill="${stroke}">${escapeXml(def.echelon)}</text>`
    : "";

  const shapeMarkup = renderShape(frame, cx, cy, w, h, stroke);

  const labelMarkup = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${frame === "point" || frame === "arrow" ? stroke : stroke}" style="paint-order: stroke; stroke: white; stroke-width: ${frame === "point" || frame === "arrow" ? 3 : 0}px;">${escapeXml(def.label)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" overflow="visible">
    ${selectionRing}
    ${echelonMark}
    ${shapeMarkup}
    ${labelMarkup}
  </svg>`;
}

function isUnitFrame(frame: SymbolDef["frame"]) {
  return frame === "rect" || frame === "square" || frame === "circle";
}

function renderShape(
  frame: SymbolDef["frame"],
  cx: number,
  cy: number,
  w: number,
  h: number,
  stroke: string,
) {
  const fill = "rgba(255,255,255,0.92)";
  const sw = 2.2;
  switch (frame) {
    case "rect":
      return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case "square": {
      const s = Math.min(w, h);
      return `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    case "triangle": {
      const r = h / 2;
      const pts = [
        [cx, cy - r],
        [cx + r * 0.95, cy + r * 0.75],
        [cx - r * 0.95, cy + r * 0.75],
      ]
        .map((p) => p.join(","))
        .join(" ");
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    case "circle": {
      const r = Math.min(w, h) / 2;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    case "ellipse":
      return `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2.6}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case "diamond": {
      const r = h / 2;
      const pts = [
        [cx, cy - r],
        [cx + r, cy],
        [cx, cy + r],
        [cx - r, cy],
      ]
        .map((p) => p.join(","))
        .join(" ");
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    case "hexagon": {
      const rx = w / 2;
      const ry = h / 2;
      const pts = [
        [cx - rx, cy],
        [cx - rx * 0.5, cy - ry],
        [cx + rx * 0.5, cy - ry],
        [cx + rx, cy],
        [cx + rx * 0.5, cy + ry],
        [cx - rx * 0.5, cy + ry],
      ]
        .map((p) => p.join(","))
        .join(" ");
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    case "arrow": {
      const r = h / 2;
      return `<path d="M ${cx - r} ${cy + r * 0.5} L ${cx + r * 0.2} ${cy + r * 0.5} L ${cx + r * 0.2} ${cy + r} L ${cx + r} ${cy} L ${cx + r * 0.2} ${cy - r} L ${cx + r * 0.2} ${cy - r * 0.5} L ${cx - r} ${cy - r * 0.5} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    }
    case "point":
    default:
      return `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${stroke}" stroke="white" stroke-width="1"/>`;
  }
}

function labelFontSize(label: string, w: number) {
  const len = Math.max(label.length, 1);
  const base = w / (len * 0.62);
  return Math.max(7, Math.min(13, base));
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function symbolDataUri(def: SymbolDef, size = 40) {
  const svg = renderSymbolSvg(def, { size });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
