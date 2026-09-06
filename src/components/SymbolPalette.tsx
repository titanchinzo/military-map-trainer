"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, SYMBOLS } from "@/lib/symbols";
import { symbolDataUri } from "@/lib/renderSymbol";
import { AFFILIATION_LABEL } from "@/lib/colors";
import type { SymbolDef } from "@/types/symbol";

export default function SymbolPalette({
  onPick,
}: {
  /** Called on click/tap (as a mouse/touch-friendly alternative to drag). */
  onPick?: (def: SymbolDef) => void;
}) {
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(
    CATEGORIES[0],
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? SYMBOLS.filter(
          (s) =>
            s.mn.toLowerCase().includes(q) ||
            s.label.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
        )
      : SYMBOLS;

    const map = new Map<string, SymbolDef[]>();
    for (const cat of CATEGORIES) map.set(cat, []);
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [query]);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Тэмдэг хайх…"
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-2 text-[11px] leading-snug text-zinc-500">
          Тэмдгийг газрын зураг руу чирнэ, эсвэл дарж сонгоод зураг дээр
          дахин дарж байрлуулна. Байрлуулсны дараа 2–3 секунд хулгана
          байлгавал тодорхойлолт гарна.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {[...grouped.entries()]
          .filter(([, items]) => items.length > 0)
          .map(([category, items]) => {
            const isOpen = query.length > 0 || openCategory === category;
            return (
              <div key={category} className="border-b border-zinc-800">
                <button
                  type="button"
                  onClick={() =>
                    setOpenCategory(isOpen && !query ? null : category)
                  }
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
                >
                  <span>{category}</span>
                  <span className="text-zinc-500">{items.length}</span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                    {items.map((def) => (
                      <SymbolTile key={def.id} def={def} onPick={onPick} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function SymbolTile({
  def,
  onPick,
}: {
  def: SymbolDef;
  onPick?: (def: SymbolDef) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", def.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onPick?.(def)}
      title={`${def.mn} — ${AFFILIATION_LABEL[def.color]}`}
      className="group flex cursor-grab flex-col items-center gap-1 rounded-md border border-transparent bg-zinc-950/50 p-1.5 hover:border-blue-500 hover:bg-zinc-800 active:cursor-grabbing"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={symbolDataUri(def, 36)}
        alt={def.mn}
        width={36}
        height={36}
        draggable={false}
        className="pointer-events-none"
      />
      <span className="line-clamp-2 text-center text-[10px] leading-tight text-zinc-400 group-hover:text-zinc-200">
        {def.mn}
      </span>
    </button>
  );
}
