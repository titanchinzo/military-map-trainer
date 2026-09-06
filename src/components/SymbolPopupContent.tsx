"use client";

import { AFFILIATION_HEX, AFFILIATION_LABEL } from "@/lib/colors";
import { APPROXIMATION_NOTE, SYMBOLS } from "@/lib/symbols";
import type { AffiliationColor, PlacedSymbol, SymbolDef } from "@/types/symbol";

const AFFILIATION_ORDER: AffiliationColor[] = [
  "friendly",
  "hostile",
  "green",
  "brown",
  "tan",
  "yellow",
  "orange",
  "black",
];

// Branch-of-service glyphs (§2.4) a unit box (§2.2 "Анги, салбар") can be
// marked with, so e.g. a generic "Батальон" can become "Уулын" (mountain).
const BRANCH_OPTIONS = SYMBOLS.filter(
  (s) => s.category === "Төрөл, мэргэжлийн цэрэг" && s.glyph,
);

export default function SymbolPopupContent({
  def,
  placement,
  onDesignationChange,
  onAffiliationChange,
  onBranchChange,
  onDelete,
}: {
  def: SymbolDef;
  placement: PlacedSymbol;
  onDesignationChange: (value: string) => void;
  onAffiliationChange: (color: AffiliationColor) => void;
  onBranchChange: (branchGlyphId: string | undefined) => void;
  onDelete: () => void;
}) {
  const currentColor = placement.affiliation ?? def.color;
  return (
    <div className="w-64 space-y-2 text-zinc-900">
      <div>
        <p className="text-sm font-bold leading-tight">{def.mn}</p>
        <p className="text-xs text-zinc-500">{def.ref}</p>
      </div>

      <p className="text-xs leading-snug text-zinc-700">{def.desc}</p>

      {def.approximate && (
        <p className="rounded bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-800">
          ⚠ {APPROXIMATION_NOTE}
        </p>
      )}

      <div>
        <p className="mb-1 text-[11px] font-medium text-zinc-600">
          Харьяалал: {AFFILIATION_LABEL[currentColor]}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {AFFILIATION_ORDER.map((color) => (
            <button
              key={color}
              type="button"
              title={AFFILIATION_LABEL[color]}
              aria-label={AFFILIATION_LABEL[color]}
              onClick={() => onAffiliationChange(color)}
              className={`h-5 w-5 rounded-full border-2 ${
                color === currentColor
                  ? "border-zinc-900 ring-2 ring-offset-1 ring-zinc-400"
                  : "border-white"
              }`}
              style={{ backgroundColor: AFFILIATION_HEX[color] }}
            />
          ))}
        </div>
      </div>

      {def.category === "Анги, салбар" && (
        <label className="block text-[11px] font-medium text-zinc-600">
          Төрөл, мэргэжлийн цэрэг
          <select
            value={placement.branchGlyphId ?? ""}
            onChange={(e) => onBranchChange(e.target.value || undefined)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">(сонгоогүй)</option>
            {BRANCH_OPTIONS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.mn}
              </option>
            ))}
          </select>
        </label>
      )}

      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-zinc-600">
        {def.echelon && (
          <>
            <dt className="font-medium">Шатлал</dt>
            <dd>{def.echelon}</dd>
          </>
        )}
        <dt className="font-medium">Байршил</dt>
        <dd>
          {placement.lat.toFixed(5)}, {placement.lng.toFixed(5)}
        </dd>
        <dt className="font-medium">Далайн түвшнээс</dt>
        <dd>
          {placement.elevation === undefined ? (
            <span className="text-zinc-400">ачааллаж байна…</span>
          ) : placement.elevation === null ? (
            <span className="text-zinc-400" title={placement.elevationError}>
              тодорхойгүй
            </span>
          ) : (
            `${Math.round(placement.elevation)} м`
          )}
        </dd>
      </dl>

      <label className="block text-[11px] font-medium text-zinc-600">
        Харьяаллын дугаар / тэмдэглэл
        <input
          type="text"
          defaultValue={placement.designation ?? ""}
          onChange={(e) => onDesignationChange(e.target.value)}
          placeholder="жиш: 1МБР"
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={onDelete}
        className="w-full rounded bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
      >
        Устгах
      </button>
    </div>
  );
}
