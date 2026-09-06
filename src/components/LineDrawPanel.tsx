"use client";

import { LINE_TYPES } from "@/lib/lineTypes";
import { ECHELON_LABEL, ECHELON_ORDER } from "@/lib/echelonLabels";
import type { Echelon } from "@/types/symbol";

export interface LineDrawChoice {
  typeId: string;
  echelon?: Echelon;
  label: string;
}

export default function LineDrawPanel({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (choice: LineDrawChoice) => void;
}) {
  if (!open) return null;

  const boundaryType = LINE_TYPES.find((t) => t.id === "boundary")!;
  const lineTypes = LINE_TYPES.filter(
    (t) => t.kind !== "area" && t.id !== "boundary",
  );
  const areaTypes = LINE_TYPES.filter((t) => t.kind === "area");

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Шугам, муж зурах
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Хаах"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Хязгаарлах шугам (§2.8)
          </p>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {ECHELON_ORDER.map((ech) => (
              <button
                key={ech}
                type="button"
                onClick={() =>
                  onSelect({
                    typeId: "boundary",
                    echelon: ech,
                    label: `${boundaryType.mn} (${ECHELON_LABEL[ech]})`,
                  })
                }
                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-left text-xs text-zinc-200 hover:border-blue-500 hover:bg-zinc-700"
              >
                {ECHELON_LABEL[ech]}
              </button>
            ))}
          </div>

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Чиглэл, үүрэг (§2.9)
          </p>
          <div className="mb-3 space-y-1">
            {lineTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect({ typeId: t.id, label: t.mn })}
                className="block w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-left text-xs text-zinc-200 hover:border-blue-500 hover:bg-zinc-700"
              >
                {t.mn}
              </button>
            ))}
          </div>

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Район, муж (§2.9)
          </p>
          <div className="space-y-1">
            {areaTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect({ typeId: t.id, label: t.mn })}
                className="block w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-left text-xs text-zinc-200 hover:border-blue-500 hover:bg-zinc-700"
              >
                {t.mn}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
