"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  CircleMarker,
  AttributionControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { AffiliationColor, PlacedSymbol } from "@/types/symbol";
import type { PlacedLine } from "@/types/line";
import type { BoardView } from "@/types/db";
import { getSymbol } from "@/lib/symbols";
import { getLineType } from "@/lib/lineTypes";
import { AFFILIATION_HEX } from "@/lib/colors";
import { renderSymbol } from "@/lib/renderSymbol";
import SymbolPopupContent from "@/components/SymbolPopupContent";
import LinePopupContent from "@/components/LinePopupContent";
import type { LineDrawChoice } from "@/components/LineDrawPanel";

export const DEFAULT_CENTER: [number, number] = [47.79185, 91.78977];
export const DEFAULT_ZOOM = 16;
const HOVER_DELAY_MS = 2200;

function makeDivIcon(
  def: NonNullable<ReturnType<typeof getSymbol>>,
  selected: boolean,
  colorOverride?: AffiliationColor,
  branchGlyphId?: string,
  designation?: string,
) {
  const centerGlyph = branchGlyphId
    ? getSymbol(branchGlyphId)?.glyph
    : undefined;
  // Size and anchor come from the symbol itself: a battalion box is wider
  // than a company box (§1.8), and a command-post flag is anchored at the
  // foot of its staff rather than at the frame's centre.
  const r = renderSymbol(def, { colorOverride, centerGlyph, designation });
  return L.divIcon({
    html: r.svg,
    className: `mmt-marker${selected ? " mmt-marker-selected" : ""}`,
    iconSize: [r.width, r.height],
    iconAnchor: [r.anchorX, r.anchorY],
    popupAnchor: [r.width / 2 - r.anchorX, -r.anchorY],
  });
}

/** Shows the map's current scale as a "1:N" ratio (matching Т4-2022 §1.8's
 * paper-map scale table) instead of Leaflet's default linear distance bar. */
function RatioScaleControl() {
  const map = useMap();

  useEffect(() => {
    const div = L.DomUtil.create("div", "leaflet-control leaflet-bar mmt-ratio-scale");
    const control = new L.Control({ position: "bottomleft" });
    control.onAdd = () => div;
    control.addTo(map);

    function update() {
      const centerLat = map.getCenter().lat;
      const zoom = map.getZoom();
      const metersPerPixel =
        (Math.cos((centerLat * Math.PI) / 180) * 2 * Math.PI * 6378137) /
        (256 * Math.pow(2, zoom));
      const dpi = 96;
      const denominator = Math.round(metersPerPixel * (dpi / 0.0254));
      div.textContent = `Масштаб 1:${denominator.toLocaleString("mn-MN")}`;
    }
    update();
    map.on("zoomend", update);
    map.on("moveend", update);
    return () => {
      map.off("zoomend", update);
      map.off("moveend", update);
      control.remove();
    };
  }, [map]);

  return null;
}

/**
 * Газрын зургийн харагдацыг (төв + zoom) хоёр чиглэлд холбоно: эзэмшигчийнхийг
 * дээш дамжуулж хадгалуулах, «багшийг дагах» горимд алсын утгаар шилжүүлэх.
 */
function ViewSync({
  remoteView,
  onViewChange,
}: {
  remoteView?: BoardView | null;
  onViewChange?: (view: BoardView) => void;
}) {
  const map = useMap();
  // Алсын шилжилтийг өөрийн хөдөлгөөн гэж ойлгож буцааж илгээхээс сэргийлнэ.
  const applyingRemote = useRef(false);

  useMapEvents({
    moveend() {
      if (applyingRemote.current || !onViewChange) return;
      const c = map.getCenter();
      onViewChange({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    },
  });

  useEffect(() => {
    if (!remoteView) return;
    const c = map.getCenter();
    const same =
      Math.abs(c.lat - remoteView.lat) < 1e-6 &&
      Math.abs(c.lng - remoteView.lng) < 1e-6 &&
      map.getZoom() === remoteView.zoom;
    if (same) return;
    applyingRemote.current = true;
    map.setView([remoteView.lat, remoteView.lng], remoteView.zoom, { animate: true });
    const t = setTimeout(() => {
      applyingRemote.current = false;
    }, 600);
    return () => clearTimeout(t);
  }, [map, remoteView]);

  return null;
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

/**
 * One placed symbol. Split into its own component so each marker's Leaflet
 * icon is memoised on just the fields that affect its SVG. `placements` is a
 * fresh array on every edit, so a single useMemo over the whole array rebuilt
 * — and setIcon()'d — every marker on the map whenever anything changed: a
 * keystroke in one designation field, or an elevation response arriving for an
 * unrelated marker.
 */
function SymbolMarker({
  placement,
  def,
  selected,
  readOnly,
  registerMarker,
  onSelect,
  onPopupClose,
  onHoverIn,
  onHoverOut,
  onMoveSymbol,
  onUpdateDesignation,
  onUpdateAffiliation,
  onUpdateBranch,
  onDeleteSymbol,
}: {
  placement: PlacedSymbol;
  def: NonNullable<ReturnType<typeof getSymbol>>;
  selected: boolean;
  readOnly: boolean;
  registerMarker: (uid: string, marker: L.Marker | null) => void;
  onSelect: (uid: string) => void;
  onPopupClose: (uid: string) => void;
  onHoverIn: (uid: string) => void;
  onHoverOut: (uid: string) => void;
  onMoveSymbol: (uid: string, lat: number, lng: number) => void;
  onUpdateDesignation: (uid: string, designation: string) => void;
  onUpdateAffiliation: (uid: string, affiliation: AffiliationColor) => void;
  onUpdateBranch: (uid: string, branchGlyphId: string | undefined) => void;
  onDeleteSymbol: (uid: string) => void;
}) {
  const { uid, lat, lng, affiliation, branchGlyphId, designation } = placement;

  const icon = useMemo(
    () => makeDivIcon(def, selected, affiliation, branchGlyphId, designation),
    [def, selected, affiliation, branchGlyphId, designation],
  );

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      draggable={!readOnly}
      ref={(instance) => registerMarker(uid, instance)}
      eventHandlers={{
        click: () => onSelect(uid),
        mouseover: () => onHoverIn(uid),
        mouseout: () => onHoverOut(uid),
        popupclose: () => onPopupClose(uid),
        dragend: (e) => {
          const pos = (e.target as L.Marker).getLatLng();
          onMoveSymbol(uid, pos.lat, pos.lng);
        },
      }}
    >
      <Popup autoPan={false} closeButton>
        <SymbolPopupContent
          def={def}
          placement={placement}
          readOnly={readOnly}
          onDesignationChange={(value) => onUpdateDesignation(uid, value)}
          onAffiliationChange={(color) => onUpdateAffiliation(uid, color)}
          onBranchChange={(branchId) => onUpdateBranch(uid, branchId)}
          onDelete={() => onDeleteSymbol(uid)}
        />
      </Popup>
    </Marker>
  );
}

export default function MapCanvas({
  placements,
  lines,
  pendingSymbolId = null,
  drawChoice = null,
  draftPoints,
  readOnly = false,
  remoteView = null,
  onViewChange,
  onDropSymbol,
  onMoveSymbol,
  onDeleteSymbol,
  onUpdateDesignation,
  onUpdateAffiliation,
  onUpdateBranch,
  onAddDraftPoint,
  onFinishDraw,
  onCancelDraw,
  onDeleteLine,
  onUpdateLineAffiliation,
}: {
  placements: PlacedSymbol[];
  lines: PlacedLine[];
  pendingSymbolId?: string | null;
  drawChoice?: LineDrawChoice | null;
  /** Vertices of the shape currently being drawn. Owned by MapShell so its
   * "Дуусгах" button can show the count and refuse an incomplete shape. */
  draftPoints: [number, number][];
  /** Зөвхөн харах — хичээлийн дэлгэц, сурагчийн ажлыг хянахад. */
  readOnly?: boolean;
  /** Дагах ёстой алсын харагдац (багшийн зураг). */
  remoteView?: BoardView | null;
  onViewChange?: (view: BoardView) => void;
  onDropSymbol: (symbolId: string, lat: number, lng: number) => void;
  onMoveSymbol: (uid: string, lat: number, lng: number) => void;
  onDeleteSymbol: (uid: string) => void;
  onUpdateDesignation: (uid: string, designation: string) => void;
  onUpdateAffiliation: (uid: string, affiliation: AffiliationColor) => void;
  onUpdateBranch: (uid: string, branchGlyphId: string | undefined) => void;
  onAddDraftPoint: (lat: number, lng: number) => void;
  onFinishDraw: () => void;
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

  // A deleted marker's pending hover timer would otherwise stay in the record
  // until the whole map unmounts, firing openPopup() on a gone marker.
  useEffect(() => {
    const live = new Set(placements.map((p) => p.uid));
    for (const [uid, timer] of Object.entries(hoverTimers.current)) {
      if (live.has(uid)) continue;
      clearTimeout(timer);
      delete hoverTimers.current[uid];
    }
  }, [placements]);

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
      if (isEditingText || readOnly) return;

      if (drawChoice) {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancelDraw();
        } else if (e.key === "Enter") {
          e.preventDefault();
          onFinishDraw();
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
    onFinishDraw,
    readOnly,
  ]);

  const handleMouseOver = useCallback(
    (uid: string) => {
      // Once a marker's popup is pinned open by a click (selectedUid), don't
      // let hover timing fight with it — e.g. moving the mouse from the icon
      // into the popup to use the color picker fires a mouseout/mouseover
      // that used to close and then, after the delay, reopen it unprompted.
      if (uid === selectedUid) return;
      clearTimeout(hoverTimers.current[uid]);
      hoverTimers.current[uid] = setTimeout(() => {
        markerRefs.current[uid]?.openPopup();
      }, HOVER_DELAY_MS);
    },
    [selectedUid],
  );

  const registerMarker = useCallback((uid: string, marker: L.Marker | null) => {
    if (marker) markerRefs.current[uid] = marker;
    else delete markerRefs.current[uid];
  }, []);

  const handlePopupClose = useCallback((uid: string) => {
    setSelectedUid((current) => (current === uid ? null : current));
  }, []);

  const handleMouseOut = useCallback(
    (uid: string) => {
      clearTimeout(hoverTimers.current[uid]);
      if (uid === selectedUid) return;
      markerRefs.current[uid]?.closePopup();
    },
    [selectedUid],
  );

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
      attributionControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
        subdomains={["a", "b", "c"]}
      />
      <AttributionControl position="bottomright" prefix={false} />
      <RatioScaleControl />
      <ViewSync remoteView={remoteView} onViewChange={onViewChange} />
      {!readOnly && <DropHandler onDropSymbol={onDropSymbol} />}
      <ClickToPlaceHandler
        pendingSymbolId={pendingSymbolId}
        drawChoice={drawChoice}
        onPlace={onDropSymbol}
        onAddPoint={onAddDraftPoint}
        onDeselect={() => {
          setSelectedUid(null);
          setSelectedLineUid(null);
        }}
      />

      {placements.map((p) => {
        const def = getSymbol(p.symbolId);
        if (!def) return null;
        return (
          <SymbolMarker
            key={p.uid}
            placement={p}
            def={def}
            selected={p.uid === selectedUid}
            readOnly={readOnly}
            registerMarker={registerMarker}
            onSelect={setSelectedUid}
            onPopupClose={handlePopupClose}
            onHoverIn={handleMouseOver}
            onHoverOut={handleMouseOut}
            onMoveSymbol={onMoveSymbol}
            onUpdateDesignation={onUpdateDesignation}
            onUpdateAffiliation={onUpdateAffiliation}
            onUpdateBranch={onUpdateBranch}
            onDeleteSymbol={onDeleteSymbol}
          />
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
              readOnly={readOnly}
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
