"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import SymbolPalette from "@/components/SymbolPalette";
import GlossaryModal from "@/components/GlossaryModal";
import LineDrawPanel, { type LineDrawChoice } from "@/components/LineDrawPanel";
import { getSymbol } from "@/lib/symbols";
import { getLineType } from "@/lib/lineTypes";
import { useSupabase } from "@/lib/supabase/client";
import { useOwnBoard } from "@/hooks/useOwnBoard";
import type { BoardState } from "@/lib/boards";
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

/**
 * Газрын зургийн ажлын талбар. Гурван горимд ажиллана:
 *  1. өөрийн зураг — засварлаж, Supabase руу шууд бичнэ;
 *  2. багшийн хичээлийн дэлгэц — `remoteBoard` + `readOnly`, харагдац нь дагана;
 *  3. сурагчийн ажлыг хянах — `remoteBoard` + `readOnly`.
 */
export default function MapShell({
  readOnly = false,
  remoteBoard = null,
  followView = false,
  banner = null,
}: {
  readOnly?: boolean;
  /** Өгвөл эндээс зурна (өөрийн зургийг ачаалахгүй). */
  remoteBoard?: BoardState | null;
  /** Алсын зургийн төв/zoom-ыг дагах эсэх. */
  followView?: boolean;
  banner?: ReactNode;
} = {}) {
  const { user, isLoaded } = useUser();
  // null until Clerk resolves who's signed in, so we don't briefly load (and
  // then overwrite) "guest" data before swapping to the real user's layout.
  const userId = isLoaded ? (user?.id ?? null) : null;

  const supabase = useSupabase();
  // Зөвхөн харах горимд өөрийн зургийг огт ачаалахгүй.
  const own = useOwnBoard(supabase, readOnly ? null : userId);
  const placements = remoteBoard ? remoteBoard.placements : own.placements;
  const lines = remoteBoard ? remoteBoard.lines : own.lines;
  const { setPlacements, setLines } = own;

  const [pendingSymbolId, setPendingSymbolId] = useState<string | null>(null);
  const [drawChoice, setDrawChoice] = useState<LineDrawChoice | null>(null);
  const [lineDrawPanelOpen, setLineDrawPanelOpen] = useState(false);
  // Vertices of the shape being drawn. Kept here rather than inside MapCanvas
  // so the "Дуусгах" button can show progress and explain a refusal.
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [drawWarning, setDrawWarning] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  // Esc cancels "click to place" mode.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingSymbolId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Highest request number issued per placement. A response is applied only if
  // it is still the latest one for that marker, so dragging a marker several
  // times in a row can't leave the elevation of an intermediate position.
  const elevationSeq = useRef<Record<string, number>>({});

  const fetchElevation = useCallback(
    async (placementUid: string, lat: number, lng: number) => {
      const seq = (elevationSeq.current[placementUid] ?? 0) + 1;
      elevationSeq.current[placementUid] = seq;
      const isStale = () => elevationSeq.current[placementUid] !== seq;
      try {
        const res = await fetch(
          `/api/elevation?lat=${lat}&lon=${lng}`,
        );
        const data = await res.json();
        if (isStale()) return;
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
        if (isStale()) return;
        setPlacements((prev) =>
          prev.map((p) =>
            p.uid === placementUid
              ? { ...p, elevation: null, elevationError: "Сүлжээний алдаа" }
              : p,
          ),
        );
      }
    },
    [setPlacements],
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
    [fetchElevation, setPlacements],
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
    [fetchElevation, setPlacements],
  );

  const handleDeleteSymbol = useCallback(
    (deleteUid: string) => {
      setPlacements((prev) => prev.filter((p) => p.uid !== deleteUid));
      delete elevationSeq.current[deleteUid];
    },
    [setPlacements],
  );

  const handleUpdateDesignation = useCallback(
    (updateUid: string, designation: string) => {
      setPlacements((prev) =>
        prev.map((p) => (p.uid === updateUid ? { ...p, designation } : p)),
      );
    },
    [setPlacements],
  );

  const handleUpdateAffiliation = useCallback(
    (updateUid: string, affiliation: AffiliationColor) => {
      setPlacements((prev) =>
        prev.map((p) => (p.uid === updateUid ? { ...p, affiliation } : p)),
      );
    },
    [setPlacements],
  );

  const handleUpdateBranch = useCallback(
    (updateUid: string, branchGlyphId: string | undefined) => {
      setPlacements((prev) =>
        prev.map((p) => (p.uid === updateUid ? { ...p, branchGlyphId } : p)),
      );
    },
    [setPlacements],
  );

  const handlePick = useCallback((def: SymbolDef) => {
    setDrawChoice(null);
    setDraftPoints([]);
    setDrawWarning(null);
    setPendingSymbolId((current) => (current === def.id ? null : def.id));
  }, []);

  const handleClearAll = useCallback(() => {
    if (placements.length === 0 && lines.length === 0) return;
    if (!window.confirm("Байрлуулсан бүх тэмдгийг устгах уу?")) return;
    setPlacements([]);
    setLines([]);
    elevationSeq.current = {};
  }, [placements.length, lines.length, setPlacements, setLines]);

  const minDraftPoints = drawChoice
    ? getLineType(drawChoice.typeId)?.kind === "area"
      ? 3
      : 2
    : 0;

  const handleStartDraw = useCallback((choice: LineDrawChoice) => {
    setPendingSymbolId(null);
    setDrawChoice(choice);
    setDraftPoints([]);
    setDrawWarning(null);
    setLineDrawPanelOpen(false);
  }, []);

  const handleCancelDraw = useCallback(() => {
    setDrawChoice(null);
    setDraftPoints([]);
    setDrawWarning(null);
  }, []);

  const handleAddDraftPoint = useCallback((lat: number, lng: number) => {
    setDraftPoints((prev) => [...prev, [lat, lng]]);
    setDrawWarning(null);
  }, []);

  const handleFinishDraw = useCallback(() => {
    if (!drawChoice) return;
    const type = getLineType(drawChoice.typeId);
    if (!type) return;
    if (draftPoints.length < minDraftPoints) {
      setDrawWarning(
        type.kind === "area"
          ? `Муж хаахад дор хаяж ${minDraftPoints} цэг хэрэгтэй — одоо ${draftPoints.length}.`
          : `Шугам зурахад дор хаяж ${minDraftPoints} цэг хэрэгтэй — одоо ${draftPoints.length}.`,
      );
      return;
    }
    const newLine: PlacedLine = {
      uid: uid(),
      typeId: drawChoice.typeId,
      points: draftPoints,
      echelon: drawChoice.echelon,
      createdAt: Date.now(),
    };
    setLines((prev) => [...prev, newLine]);
    setDrawChoice(null);
    setDraftPoints([]);
    setDrawWarning(null);
  }, [drawChoice, draftPoints, minDraftPoints, setLines]);

  const handleDeleteLine = useCallback(
    (deleteUid: string) => {
      setLines((prev) => prev.filter((l) => l.uid !== deleteUid));
    },
    [setLines],
  );

  const handleUpdateLineAffiliation = useCallback(
    (updateUid: string, affiliation: AffiliationColor) => {
      setLines((prev) =>
        prev.map((l) => (l.uid === updateUid ? { ...l, affiliation } : l)),
      );
    },
    [setLines],
  );

  return (
    <div className="flex min-h-0 flex-1">
      {!readOnly && <SymbolPalette onPick={handlePick} />}
      <div className="relative min-h-0 flex-1">
        <MapCanvas
          placements={placements}
          lines={lines}
          pendingSymbolId={pendingSymbolId}
          drawChoice={drawChoice}
          draftPoints={draftPoints}
          readOnly={readOnly}
          remoteView={followView ? (remoteBoard?.view ?? null) : null}
          onViewChange={readOnly ? undefined : own.setView}
          onDropSymbol={handleDropSymbol}
          onMoveSymbol={handleMoveSymbol}
          onDeleteSymbol={handleDeleteSymbol}
          onUpdateDesignation={handleUpdateDesignation}
          onUpdateAffiliation={handleUpdateAffiliation}
          onUpdateBranch={handleUpdateBranch}
          onAddDraftPoint={handleAddDraftPoint}
          onFinishDraw={handleFinishDraw}
          onCancelDraw={handleCancelDraw}
          onDeleteLine={handleDeleteLine}
          onUpdateLineAffiliation={handleUpdateLineAffiliation}
        />

        <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex flex-col items-start gap-2">
          {banner}
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
            <div className="pointer-events-auto flex max-w-md flex-col gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
              <div className="flex items-center gap-2">
                <span>
                  Зурж байна: «{drawChoice.label}» — газрын зураг дээр цэг
                  бүрд дарна уу (цэг: {draftPoints.length}/{minDraftPoints})
                </span>
                <button
                  type="button"
                  onClick={handleFinishDraw}
                  disabled={draftPoints.length < minDraftPoints}
                  title={
                    draftPoints.length < minDraftPoints
                      ? `Дор хаяж ${minDraftPoints} цэг тавина уу`
                      : undefined
                  }
                  className="rounded bg-sky-700 px-1.5 py-0.5 hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-700/40 disabled:text-sky-200"
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
              {drawWarning && (
                <span className="font-normal text-amber-100">
                  ⚠ {drawWarning}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
          <div className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300 shadow-lg backdrop-blur">
            Байрлуулсан: {placements.length} · Шугам/муж: {lines.length}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setLineDrawPanelOpen(true)}
              className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur hover:bg-zinc-800"
            >
              Шугам, муж зурах
            </button>
          )}
          <button
            type="button"
            onClick={() => setGlossaryOpen(true)}
            className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur hover:bg-zinc-800"
          >
            Нэр томьёоны тайлбар
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handleClearAll}
              className="pointer-events-auto rounded-md bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-red-400 shadow-lg backdrop-blur hover:bg-zinc-800"
            >
              Бүгдийг устгах
            </button>
          )}
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
