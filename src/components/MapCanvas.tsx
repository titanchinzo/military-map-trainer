"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { PlacedSymbol } from "@/types/symbol";
import { getSymbol } from "@/lib/symbols";
import { renderSymbolSvg } from "@/lib/renderSymbol";
import SymbolPopupContent from "@/components/SymbolPopupContent";

export const DEFAULT_CENTER: [number, number] = [47.79185, 91.78977];
export const DEFAULT_ZOOM = 16;
const MARKER_SIZE = 44;
const HOVER_DELAY_MS = 2200;

function makeDivIcon(
  def: NonNullable<ReturnType<typeof getSymbol>>,
  selected: boolean,
) {
  const html = renderSymbolSvg(def, { size: MARKER_SIZE });
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
 * map click — a touch- and accessibility-friendly alternative to drag/drop. */
function ClickToPlaceHandler({
  pendingSymbolId,
  onPlace,
  onDeselect,
}: {
  pendingSymbolId: string | null;
  onPlace: (symbolId: string, lat: number, lng: number) => void;
  onDeselect: () => void;
}) {
  useMapEvents({
    click(e) {
      if (pendingSymbolId) {
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
  pendingSymbolId = null,
  onDropSymbol,
  onMoveSymbol,
  onDeleteSymbol,
  onUpdateDesignation,
}: {
  placements: PlacedSymbol[];
  pendingSymbolId?: string | null;
  onDropSymbol: (symbolId: string, lat: number, lng: number) => void;
  onMoveSymbol: (uid: string, lat: number, lng: number) => void;
  onDeleteSymbol: (uid: string) => void;
  onUpdateDesignation: (uid: string, designation: string) => void;
}) {
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const hoverTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Lets a selected symbol be removed with the Delete/Backspace key, since
  // opening its popup and clicking "Устгах" is fiddly right after dragging.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedUid) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditingText) return;
      e.preventDefault();
      onDeleteSymbol(selectedUid);
      setSelectedUid(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedUid, onDeleteSymbol]);

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
      className={`h-full w-full ${pendingSymbolId ? "cursor-crosshair" : ""}`}
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
        onPlace={onDropSymbol}
        onDeselect={() => setSelectedUid(null)}
      />

      {placements.map((p) => {
        const def = getSymbol(p.symbolId);
        if (!def) return null;
        return (
          <Marker
            key={p.uid}
            position={[p.lat, p.lng]}
            icon={makeDivIcon(def, p.uid === selectedUid)}
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
                onDelete={() => onDeleteSymbol(p.uid)}
              />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
