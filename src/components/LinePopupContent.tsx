"use client";

import { AFFILIATION_HEX, AFFILIATION_LABEL } from "@/lib/colors";
import type { AffiliationColor } from "@/types/symbol";
import type { LineTypeDef, PlacedLine } from "@/types/line";

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

export default function LinePopupContent({
  type,
  line,
  onAffiliationChange,
  onDelete,
}: {
  type: LineTypeDef;
  line: PlacedLine;
  onAffiliationChange: (color: AffiliationColor) => void;
  onDelete: () => void;
}) {
  const currentColor = line.affiliation ?? "friendly";
  return (
    <div className="w-60 space-y-2 text-zinc-900">
      <div>
        <p className="text-sm font-bold leading-tight">
          {type.mn}
          {line.echelon ? ` (${line.echelon})` : ""}
        </p>
        <p className="text-xs text-zinc-500">{type.ref}</p>
      </div>

      <p className="text-xs leading-snug text-zinc-700">{type.desc}</p>

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

      <p className="text-[11px] text-zinc-600">
        Цэгийн тоо: {line.points.length}
      </p>

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
