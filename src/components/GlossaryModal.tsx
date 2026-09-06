"use client";

import { useEffect, useState } from "react";
import { GLOSSARY } from "@/lib/glossary";

export default function GlossaryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const entries = q
    ? GLOSSARY.filter(
        (entry) =>
          entry.term.toLowerCase().includes(q) ||
          entry.definition.toLowerCase().includes(q),
      )
    : GLOSSARY;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Цэргийн нэр томьёоны тайлбар
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

        <div className="border-b border-zinc-800 px-4 py-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Нэр томьёо хайх…"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        <dl className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {entries.length === 0 && (
            <p className="text-sm text-zinc-500">Илэрц олдсонгүй.</p>
          )}
          {entries.map((entry) => (
            <div key={entry.id}>
              <dt className="text-sm font-semibold text-zinc-100">
                {entry.term}
                {entry.source && (
                  <span className="ml-2 text-[10px] font-normal text-zinc-500">
                    {entry.source}
                  </span>
                )}
              </dt>
              <dd className="mt-0.5 space-y-1.5 text-xs leading-relaxed text-zinc-400">
                {entry.definition.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
