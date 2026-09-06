"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import SymbolPalette from "@/components/SymbolPalette";
import GlossaryModal from "@/components/GlossaryModal";
import LineDrawPanel, { type LineDrawChoice } from "@/components/LineDrawPanel";
import { loadPlacements, savePlacements, loadLines, saveLines } from "@/lib/storage";
import { getSymbol } from "@/lib/symbols";
import { getLineType } from "@/lib/lineTypes";
import type { AffiliationColor, PlacedSymbol, SymbolDef } from "@/types/symbol";
import type { PlacedLine } from "@/types/line";

const MapCanvas = dynamic(() => import("@/components/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-zinc-500">
      Газрын зураг ачааллаж байна…
    </div>
  ),
});

function uid() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function MapShell() {
  const { user, isLoaded } = useUser();
  // null until Clerk resolves who's signed in, so we don't briefly load (and
  // then overwrite) "guest" data before swapping to the real user's layout.
  const userId = isLoaded ? (user?.id ?? "guest") : null;

  const [placements, setPlacements] = useState<PlacedSymbol[]>([]);
  const [lines, setLines] = useState<PlacedLine[]>([]);
  const [pendingSymbolId, setPendingSymbolId] = useState<string | null>(null);
  const [drawChoice, setDrawChoice] = useState<LineDrawChoice | null>(null);
  const [lineDrawPanelOpen, setLineDrawPanelOpen] = useState(false);
  // Incremented to signal MapCanvas to finish the in-progress draft (its
  // draftPoints array lives inside MapCanvas, not here).
  const [finishRequestId, setFinishRequestId] = useState(0);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  // Tracks which user's saved layout is currently loaded into `placements`.
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  // "Adjusting state during render" (see react.dev/learn/you-might-not-need-an-effect)
  // instead of setState-in-an-effect: once Clerk resolves `userId`, and it
  // differs from what we last loaded, resync `placements`/`lines` from storage.
  if (userId !== null && userId !== loadedForUserId) {
    setLoadedForUserId(userId);
    setPlacements(loadPlacements(userId));
    setLines(loadLines(userId));
  }

  // Persist on every change, once we've actually loaded a user's layout.
  useEffect(() => {
    if (loadedForUserId === null) return;
    savePlacements(loadedForUserId, placements);
  }, [placements, loadedForUserId]);

  useEffect(() => {
    if (loadedForUserId === null) return;
    saveLines(loadedForUserId, lines);
  }, [lines, loadedForUserId]);

  // Esc cancels "click to place" mode.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingSymbolId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fetchElevation = useCallback(
    async (placementUid: string, lat: number, lng: number) => {
      try {
        const res = await fetch(
          `/api/elevation?lat=${lat}&lon=${lng}`,
        );
        const data = await res.json();
        setPlacements((prev) =>
          prev.map((p) =>
            p.uid === placementUid
              ? {
                  ...p,
                  elevation: res.ok ? (data.elevation ?? null) : null,
                  elevationError: res.ok ? undefined : data.error,
                }
              : p,
          ),
        );
      } catch {
        setPlacements((prev) =>
          prev.map((p) =>
            p.uid === placementUid
              ? { ...p, elevation: null, elevationError: "Сүлжээний алдаа" }
              : p,
          ),
        );
      }
    },
    [],
  );

  const handleDropSymbol = useCallback(
    (symbolId: string, lat: number, lng: number) => {
      if (!getSymbol(symbolId)) return;
      const newUid = uid();
      const placement: PlacedSymbol = {
        uid: newUid,
        symbolId,
        lat,
        lng,
        elevation: undefined,
        createdAt: Date.now(),
      };
      setPlacements((prev) => [...prev, placement]);
      setPendingSymbolId(null);
      void fetchElevation(newUid, lat, lng);
    },
    [fetchElevation],
  );

  const handleMoveSymbol = useCallback(
    (moveUid: string, lat: number, lng: number) => {
      setPlacements((prev) =>
        prev.map((p) =>
          p.uid === moveUid
            ? { ...p, lat, lng, elevation: undefined, elevationError: undefined }
            : p,
        ),
      );
      void fetchElevation(moveUid, lat, lng);
    },
    [fetchElevation],
  );

  const handleDeleteSymbol = useCallback((deleteUid: string) => {
    setPlacements((prev) => prev.filter((p) => p.uid !== deleteUid));
  }, []);

  const handleUpdateDesignation = useCallback(
    (updateUid: string, designation: string) => {
      setPlacements((prev) =>
        prev.map((p) => (p.uid === updateUid ? { ...p, designation } : p)),
      );
    },
    [],
  );

  const handleUpdateAffiliation = useCallback(
    (updateUid: string, affiliation: AffiliationColor) => {
      setPlacements((prev) =>
        prev.map((p) => (p.uid === updateUid ? { ...p, affiliation } : p)),
      );
    },
    [],
  );

  const handleUpdateBranch = useCallback(
    (updateUid: string, branchGlyphId: string | undefined) => {
      setPlacements((prev) =>
        prev.map((p) => (p.uid === updateUid ? { ...p, branchGlyphId } : p)),
      );
    },
    [],
  );

  const handlePick = useCallback((def: SymbolDef) => {
    setDrawChoice(null);
    setPendingSymbolId((current) => (current === def.id ? null : def.id));
  }, []);

  const handleClearAll = useCallback(() => {
    if (placements.length === 0 && lines.length === 0) return;
    if (!window.confirm("Байрлуулсан бүх тэмдгийг устгах уу?")) return;
    setPlacements([]);
    setLines([]);
  }, [placements.length, lines.length]);

  const handleStartDraw = useCallback((choice: LineDrawChoice) => {
    setPendingSymbolId(null);
    setDrawChoice(choice);
    setLineDrawPanelOpen(false);
  }, []);

  const handleCancelDraw = useCallback(() => {
    setDrawChoice(null);
  }, []);

  const handleFinishLine = useCallback(
    (points: [number, number][]) => {
      if (!drawChoice || !getLineType(drawChoice.typeId)) return;
      const newLine: PlacedLine = {
        uid: uid(),
        typeId: drawChoice.typeId,
        points,
        echelon: drawChoice.echelon,
        createdAt: Date.now(),
      };
      setLines((prev) => [...prev, newLine]);
      setDrawChoice(null);
    },
    [drawChoice],
  );

  const handleDeleteLine = useCallback((deleteUid: string) => {
    setLines((prev) => prev.filter((l) => l.uid !== deleteUid));
  }, []);

  const handleUpdateLineAffiliation = useCallback(
    (updateUid: string, affiliation: AffiliationColor) => {
      setLines((prev) =>
        prev.map((l) => (l.uid === updateUid ? { ...l, affiliation } : l)),
      );
    },
    [],
  );

  return (
    <div className="flex min-h-0 flex-1">
      <SymbolPalette onPick={handlePick} />
      <div className="relative min-h-0 flex-1">
        <MapCanvas
          placements={placements}
          lines={lines}
          pendingSymbolId={pendingSymbolId}
          drawChoice={drawChoice}
          finishRequestId={finishRequestId}
          onDropSymbol={handleDropSymbol}
          onMoveSymbol={handleMoveSymbol}
          onDeleteSymbol={handleDeleteSymbol}
          onUpdateDesignation={handleUpdateDesignation}
          onUpdateAffiliation={handleUpdateAffiliation}
          onUpdateBranch={handleUpdateBranch}
          onFinishLine={handleFinishLine}
          onCancelDraw={handleCancelDraw}
          onDeleteLine={handleDeleteLine}
          onUpdateLineAffiliation={handleUpdateLineAffiliation}
        />

        <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex flex-col items-start gap-2">
          {pendingSymbolId && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
              <span>
                Байрлуулах горим: «{getSymbol(pendingSymbolId)?.mn}» — газрын
                зураг дээр дарна уу
              </span>
              <button
                type="button"
                onClick={() => setPendingSymbolId(null)}
                className="rounded bg-blue-700 px-1.5 py-0.5 hover:bg-blue-800"
              >
                Esc
              </button>
            </div>
          )}
          {drawChoice && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
              <span>
                Зурж байна: «{drawChoice.label}» — газрын зураг дээр цэг
                бүрд дарна уу
              </span>
              <button
                type="button"
                onClick={() => setFinishRequestId((n) => n + 1)}
                className="rounded bg-sky-700 px-1.5 py-0.5 hover:bg-sky-800"
              >
                Дуусгах
              </button>
              <button
                type="button"
                onClick={handleCancelDraw}
                className="rounded bg-sky-800 px-1.5 py-0.5 hover:bg-sky-900"
              >
                Esc
              </button>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
          <div className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300 shadow-lg backdrop-blur">
            Байрлуулсан: {placements.length} · Шугам/муж: {lines.length}
          </div>
          <button
            type="button"
            onClick={() => setLineDrawPanelOpen(true)}
            className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur hover:bg-zinc-800"
          >
            Шугам, муж зурах
          </button>
          <button
            type="button"
            onClick={() => setGlossaryOpen(true)}
            className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur hover:bg-zinc-800"
          >
            Нэр томьёоны тайлбар
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-red-400 shadow-lg backdrop-blur hover:bg-zinc-800"
          >
            Бүгдийг устгах
          </button>
        </div>
      </div>

      <GlossaryModal open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
      <LineDrawPanel
        open={lineDrawPanelOpen}
        onClose={() => setLineDrawPanelOpen(false)}
        onSelect={handleStartDraw}
      />
    </div>
  );
}
