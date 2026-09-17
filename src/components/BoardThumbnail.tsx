"use client";

import { AFFILIATION_HEX } from "@/lib/colors";
import { getSymbol } from "@/lib/symbols";
import type { BoardState } from "@/lib/boards";

/**
 * Сурагчийн ажлын хөнгөн ноорог: 30 ширхэг Leaflet газрын зураг зэрэг
 * ачаалахгүйн тулд байрлуулсан тэмдгүүдийг зөвхөн цэгээр SVG дээр буулгана.
 * Ажил өрнөж байгаа эсэхийг шууд харуулахад хангалттай.
 */
export default function BoardThumbnail({
  board,
  className = "",
}: {
  board: BoardState;
  className?: string;
}) {
  const points = board.placements;
  const paths = board.lines;

  if (points.length === 0 && paths.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded bg-zinc-950 text-[10px] text-zinc-600 ${className}`}
      >
        Хоосон
      </div>
    );
  }

  const lats = [
    ...points.map((p) => p.lat),
    ...paths.flatMap((l) => l.points.map((pt) => pt[0])),
  ];
  const lngs = [
    ...points.map((p) => p.lng),
    ...paths.flatMap((l) => l.points.map((pt) => pt[1])),
  ];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  // Бүх зүйл нэг цэг дээр байвал 0-д хуваахаас сэргийлнэ.
  const spanLat = Math.max(maxLat - minLat, 1e-5);
  const spanLng = Math.max(maxLng - minLng, 1e-5);

  const W = 100;
  const H = 60;
  const x = (lng: number) => ((lng - minLng) / spanLng) * (W - 12) + 6;
  const y = (lat: number) => H - 6 - ((lat - minLat) / spanLat) * (H - 12);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`rounded bg-zinc-950 ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {paths.map((line) => (
        <polyline
          key={line.uid}
          points={line.points.map((pt) => `${x(pt[1])},${y(pt[0])}`).join(" ")}
          fill="none"
          stroke={AFFILIATION_HEX[line.affiliation ?? "friendly"]}
          strokeWidth={1}
          opacity={0.8}
        />
      ))}
      {points.map((p) => {
        const color = p.affiliation ?? getSymbol(p.symbolId)?.color ?? "friendly";
        return (
          <circle
            key={p.uid}
            cx={x(p.lng)}
            cy={y(p.lat)}
            r={2}
            fill={AFFILIATION_HEX[color]}
          />
        );
      })}
    </svg>
  );
}
