"use client";

import { AFFILIATION_LABEL } from "@/lib/colors";
import { APPROXIMATION_NOTE } from "@/lib/symbols";
import type { PlacedSymbol, SymbolDef } from "@/types/symbol";

export default function SymbolPopupContent({
  def,
  placement,
  onDesignationChange,
  onDelete,
}: {
  def: SymbolDef;
  placement: PlacedSymbol;
  onDesignationChange: (value: string) => void;
  onDelete: () => void;
}) {
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

      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-zinc-600">
        <dt className="font-medium">Харьяалал</dt>
        <dd>{AFFILIATION_LABEL[def.color]}</dd>
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
