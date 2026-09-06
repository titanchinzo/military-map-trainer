"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { AffiliationColor, PlacedSymbol } from "@/types/symbol";
import type { PlacedLine } from "@/types/line";
import { getSymbol } from "@/lib/symbols";
import { getLineType } from "@/lib/lineTypes";
import { AFFILIATION_HEX } from "@/lib/colors";
import { renderSymbolSvg } from "@/lib/renderSymbol";
import SymbolPopupContent from "@/components/SymbolPopupContent";
import LinePopupContent from "@/components/LinePopupContent";
import type { LineDrawChoice } from "@/components/LineDrawPanel";

export const DEFAULT_CENTER: [number, number] = [47.79185, 91.78977];
export const DEFAULT_ZOOM = 16;
const MARKER_SIZE = 44;
const HOVER_DELAY_MS = 2200;

function makeDivIcon(
  def: NonNullable<ReturnType<typeof getSymbol>>,
  selected: boolean,
  colorOverride?: AffiliationColor,
  branchGlyphId?: string,
) {
  const centerGlyph = branchGlyphId
    ? getSymbol(branchGlyphId)?.glyph
    : undefined;
  const html = renderSymbolSvg(def, {
    size: MARKER_SIZE,
    colorOverride,
    centerGlyph,
  });
  return L.divIcon({
    html,
    className: `mmt-marker${selected ? " mmt-marker-selected" : ""}`,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
    popupAnchor: [0, -MARKER_SIZE / 2],
  });
}

/** Registers native drag/drop listeners on the Leaflet container so items
 * dragged from the palette can be dropped at the correct map coordinate. */
function DropHandler({
  onDropSymbol,
}: {
  onDropSymbol: (symbolId: string, lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const symbolId = e.dataTransfer?.getData("text/plain");
      if (!symbolId) return;
      const latlng = map.mouseEventToLatLng(e as unknown as MouseEvent);
      onDropSymbol(symbolId, latlng.lat, latlng.lng);
    };

    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);
    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
    };
  }, [map, onDropSymbol]);

  return null;
}

/** Lets a symbol picked in the palette (tap/click) be placed on the next
 * map click, and — when a line/area type is being drawn instead — adds
 * each click as the next vertex of the shape being drawn. */
function ClickToPlaceHandler({
  pendingSymbolId,
  drawChoice,
  onPlace,
  onAddPoint,
  onDeselect,
}: {
  pendingSymbolId: string | null;
  drawChoice: LineDrawChoice | null;
  onPlace: (symbolId: string, lat: number, lng: number) => void;
  onAddPoint: (lat: number, lng: number) => void;
  onDeselect: () => void;
}) {
  useMapEvents({
    click(e) {
      if (drawChoice) {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      } else if (pendingSymbolId) {
        onPlace(pendingSymbolId, e.latlng.lat, e.latlng.lng);
      } else {
        onDeselect();
      }
    },
  });
  return null;
}

export default function MapCanvas({
  placements,
  lines,
  pendingSymbolId = null,
  drawChoice = null,
  finishRequestId = 0,
  onDropSymbol,
  onMoveSymbol,
  onDeleteSymbol,
  onUpdateDesignation,
  onUpdateAffiliation,
  onUpdateBranch,
  onFinishLine,
  onCancelDraw,
  onDeleteLine,
  onUpdateLineAffiliation,
}: {
  placements: PlacedSymbol[];
  lines: PlacedLine[];
  pendingSymbolId?: string | null;
  drawChoice?: LineDrawChoice | null;
  finishRequestId?: number;
  onDropSymbol: (symbolId: string, lat: number, lng: number) => void;
  onMoveSymbol: (uid: string, lat: number, lng: number) => void;
  onDeleteSymbol: (uid: string) => void;
  onUpdateDesignation: (uid: string, designation: string) => void;
  onUpdateAffiliation: (uid: string, affiliation: AffiliationColor) => void;
  onUpdateBranch: (uid: string, branchGlyphId: string | undefined) => void;
  onFinishLine: (points: [number, number][]) => void;
  onCancelDraw: () => void;
  onDeleteLine: (uid: string) => void;
  onUpdateLineAffiliation: (uid: string, affiliation: AffiliationColor) => void;
}) {
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const hoverTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedLineUid, setSelectedLineUid] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [draftForChoice, setDraftForChoice] = useState<LineDrawChoice | null>(
    null,
  );

  // "Adjusting state during render" instead of setState-in-an-effect: reset
  // the in-progress draft whenever draw mode is turned off/changed.
  if (drawChoice !== draftForChoice) {
    setDraftForChoice(drawChoice);
    setDraftPoints([]);
  }

  const minPoints = drawChoice
    ? getLineType(drawChoice.typeId)?.kind === "area"
      ? 3
      : 2
    : 0;

  const finishDraft = useCallback(() => {
    if (draftPoints.length < minPoints) return;
    onFinishLine(draftPoints);
    setDraftPoints([]);
  }, [draftPoints, minPoints, onFinishLine]);

  // "Дуусгах" button in MapShell lives outside this component (draftPoints
  // is local state here), so it signals us via an incrementing id instead.
  const isFirstFinishSignal = useRef(true);
  useEffect(() => {
    if (isFirstFinishSignal.current) {
      isFirstFinishSignal.current = false;
      return;
    }
    finishDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishRequestId]);

  // Lets a selected symbol/line be removed with Delete/Backspace, and an
  // in-progress line draft be cancelled (Esc) or finished (Enter).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditingText) return;

      if (drawChoice) {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancelDraw();
        } else if (e.key === "Enter") {
          e.preventDefault();
          finishDraft();
        }
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedUid) {
        e.preventDefault();
        onDeleteSymbol(selectedUid);
        setSelectedUid(null);
      } else if (selectedLineUid) {
        e.preventDefault();
        onDeleteLine(selectedLineUid);
        setSelectedLineUid(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedUid,
    selectedLineUid,
    onDeleteSymbol,
    onDeleteLine,
    drawChoice,
    onCancelDraw,
    finishDraft,
  ]);

  const handleMouseOver = useCallback((uid: string) => {
    clearTimeout(hoverTimers.current[uid]);
    hoverTimers.current[uid] = setTimeout(() => {
      markerRefs.current[uid]?.openPopup();
    }, HOVER_DELAY_MS);
  }, []);

  const handleMouseOut = useCallback((uid: string) => {
    clearTimeout(hoverTimers.current[uid]);
    markerRefs.current[uid]?.closePopup();
  }, []);

  useEffect(() => {
    const timers = hoverTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className={`h-full w-full ${pendingSymbolId || drawChoice ? "cursor-crosshair" : ""}`}
      preferCanvas
    >
      <TileLayer
        attribution='Тэмдэглэгээ &copy; <a href="https://tessadem.com">TessaDEM</a> · Зураг &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) contributors &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
        subdomains={["a", "b", "c"]}
      />
      <DropHandler onDropSymbol={onDropSymbol} />
      <ClickToPlaceHandler
        pendingSymbolId={pendingSymbolId}
        drawChoice={drawChoice}
        onPlace={onDropSymbol}
        onAddPoint={(lat, lng) =>
          setDraftPoints((prev) => [...prev, [lat, lng]])
        }
        onDeselect={() => {
          setSelectedUid(null);
          setSelectedLineUid(null);
        }}
      />

      {placements.map((p) => {
        const def = getSymbol(p.symbolId);
        if (!def) return null;
        return (
          <Marker
            key={p.uid}
            position={[p.lat, p.lng]}
            icon={makeDivIcon(
              def,
              p.uid === selectedUid,
              p.affiliation,
              p.branchGlyphId,
            )}
            draggable
            ref={(instance) => {
              if (instance) markerRefs.current[p.uid] = instance;
              else delete markerRefs.current[p.uid];
            }}
            eventHandlers={{
              click: () => setSelectedUid(p.uid),
              mouseover: () => handleMouseOver(p.uid),
              mouseout: () => handleMouseOut(p.uid),
              dragend: (e) => {
                const m = e.target as L.Marker;
                const pos = m.getLatLng();
                onMoveSymbol(p.uid, pos.lat, pos.lng);
              },
            }}
          >
            <Popup autoPan={false} closeButton>
              <SymbolPopupContent
                def={def}
                placement={p}
                onDesignationChange={(value) =>
                  onUpdateDesignation(p.uid, value)
                }
                onAffiliationChange={(color) =>
                  onUpdateAffiliation(p.uid, color)
                }
                onBranchChange={(branchGlyphId) =>
                  onUpdateBranch(p.uid, branchGlyphId)
                }
                onDelete={() => onDeleteSymbol(p.uid)}
              />
            </Popup>
          </Marker>
        );
      })}

      {lines.map((l) => {
        const type = getLineType(l.typeId);
        if (!type) return null;
        const color = AFFILIATION_HEX[l.affiliation ?? "friendly"];
        const selected = l.uid === selectedLineUid;
        const pathOptions = {
          color,
          weight: selected ? 4 : 3,
          dashArray: type.dashed ? "7 5" : undefined,
          fillOpacity: type.kind === "area" ? 0.12 : 0,
        };
        const eventHandlers = { click: () => setSelectedLineUid(l.uid) };
        const popup = (
          <Popup autoPan={false} closeButton>
            <LinePopupContent
              type={type}
              line={l}
              onAffiliationChange={(color) =>
                onUpdateLineAffiliation(l.uid, color)
              }
              onDelete={() => onDeleteLine(l.uid)}
            />
          </Popup>
        );
        return type.kind === "area" ? (
          <Polygon
            key={l.uid}
            positions={l.points}
            pathOptions={pathOptions}
            eventHandlers={eventHandlers}
          >
            {popup}
          </Polygon>
        ) : (
          <Polyline
            key={l.uid}
            positions={l.points}
            pathOptions={pathOptions}
            eventHandlers={eventHandlers}
          >
            {popup}
          </Polyline>
        );
      })}

      {drawChoice && draftPoints.length > 0 && (
        <>
          <Polyline
            positions={draftPoints}
            pathOptions={{ color: "#38bdf8", weight: 2, dashArray: "4 4" }}
          />
          {draftPoints.map((pt, i) => (
            <CircleMarker
              key={i}
              center={pt}
              radius={4}
              pathOptions={{ color: "#38bdf8", fillOpacity: 1 }}
            />
          ))}
        </>
      )}
    </MapContainer>
  );
}
