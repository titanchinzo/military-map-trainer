# Тактикийн тэмдгийн сургалт (Military Tactical Symbol Trainer)

Next.js 16 + Clerk + Leaflet training app: drag Т4-2022 tactical symbols onto
a topographic map, hover ~2.2s to see the symbol's description, and see the
terrain elevation at the drop point (via TessaDEM).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up / sign in, then go to **Газрын зураг**.

### Clerk keys

`.env.local` already has **working development keys** — they were
auto-provisioned by `npx clerk@latest init` (no login required; this created
a temporary, claimable Clerk application). To manage this app later (see
signed-up users, change branding, etc.), run `npx clerk@latest auth login`
from this folder to claim it into your own Clerk account, or swap in keys
from an app you already own at
https://dashboard.clerk.com/last-active?path=api-keys.

### TessaDEM key

`TESSADEM_API_KEY` in `.env.local` is the key you gave me
(`83125385870af...`). It's read **only** server-side, in
`src/app/api/elevation/route.ts` — never sent to the browser. Its request
balance was 0 at setup time, so elevation lookups will fail until you buy
requests at https://tessadem.com/dashboard; the UI degrades gracefully
(shows "тодорхойгүй" instead of crashing) when that happens.

## How it works

- **`src/proxy.ts`** — Next.js 16 renamed `middleware.ts` → `proxy.ts`. Wraps
  Clerk's `clerkMiddleware`; every route except `/`, `/sign-in`, `/sign-up`
  requires a session.
- **`src/lib/symbols.ts`** — ~560 `SymbolDef` entries transcribed from all 82
  pages of *"Цэргийн тактикийн таних тэмдэг, тэмдэглэгээг хэрэглэх заавар
  Т4‑2022"*. `CATEGORIES` follows the manual's own table of contents in order
  — §2.1–§2.10, then appendices 1–13 with their sub-items — so a palette
  section maps 1:1 onto a section of the book. Note that the printed body
  numbers its appendices in a *different* order than the contents page lists
  them (Холбоо is printed as Хавсралт 5 but listed 7th; ЦХБ is printed as 9
  but listed 5th); each entry's `ref` cites the number printed on the page it
  came from, while its category follows the contents-page order.
  Орон нутгийн цэрэг (contents item 12) has a single entry because the manual
  ships no appendix table for it — page 71 goes straight from Барилга to
  Хэмжил зүй.
- **`src/lib/lineTypes.ts`** — 58 `LineTypeDef` entries for §2.8 boundary
  lines, §2.9 areas / mission lines / recon and deployment lines, and the
  Хавсралт 17 border-troop boundaries. These are drawn on the map rather than
  dropped as markers.
- **`src/lib/renderSymbol.ts`** — draws a symbol as SVG from its frame shape
  (§1.5), echelon mark (§1.4), and affiliation color (§1.7, exact RGB values
  from the manual's table). Used both for palette thumbnails and Leaflet
  marker icons, so they always match.
- **`src/components/MapCanvas.tsx`** — the Leaflet map (OpenTopoMap tiles,
  centered on the coordinates from your topographic-map.com link). Handles
  native HTML5 drag/drop (`map.mouseEventToLatLng`), click-to-place as a
  touch-friendly alternative, marker dragging to reposition, and the
  hover-then-wait-2.2s-then-show-popup interaction.
- **`src/app/api/elevation/route.ts`** — server route, calls TessaDEM's
  points-mode elevation API, cached in-memory for an hour per ~11m grid cell
  to conserve request balance.
- **`src/lib/storage.ts`** — placed symbols persist to `localStorage`, keyed
  by Clerk user id, so different accounts on the same browser don't collide.
  This is per-browser, not synced across devices — swap in a real database
  if you need that later.

## Known limitation — read before treating this as authoritative reference material

TessaDEM turned out to be an **elevation** API, not a map-tile service, so
the basemap comes from OpenTopoMap instead (visually the same style as
topographic-map.com).

The PDF's text layer has no usable Cyrillic ToUnicode mapping (confirmed via
`pdftotext`), so the manual has to be read visually — pages rendered to
images with `poppler` (`pdftoppm`), then read directly. Most branch/weapon/
vehicle/aircraft/operation icons in §2.4–2.10 now use a `glyph` (custom SVG
line art transcribed from the manual) instead of a generic dot; only a
handful of entries still fall back to a plain frame + abbreviation
(`approximate: true`, shown with a ⚠ note in the app) — mainly a few obscure
appendix icons not yet located in the source.

Unit boxes (Бригад/Хороо/Батальон/Рот, §2.2, and Салаа/Тасаг/Бүлэг, §2.3)
draw a default branch-of-service glyph inside the frame per the manual, and
that glyph can be swapped per placement (the popup's "Төрөл, мэргэжлийн
цэрэг" dropdown) — so e.g. a generic battalion box can be marked as
specifically "Уулын" (mountain troops) without a separate palette entry per
branch/size combination.

Boundary lines (§2.8) and area/zone/direction symbols (§2.9) are drawn, not
dropped as a point icon — see "Шугам, муж зурах" below.

## Шугам, муж зурах (§2.8–§2.9 lines and areas)

The **"Шугам, муж зурах"** button opens a panel to pick a boundary-line
echelon, a direction/mission-line type, or an area/zone type; the map then
enters draw mode (crosshair cursor) — click to add each vertex, then either
press **Enter** or the **"Дуусгах"** button to finish (Escape cancels).
Lines need ≥2 points, areas ≥3 (auto-closed into a polygon). Click a drawn
line/area to open its popup (affiliation color, delete) same as a symbol
marker; Delete/Backspace removes the selected one.

- **`src/types/line.ts` / `src/lib/lineTypes.ts`** — the §2.8/§2.9 catalog
  and `PlacedLine` data model (an array of `[lat, lng]` vertices, not a
  single point). Boundary lines are one parameterized type (echelon chosen
  at draw time) rather than 10 near-duplicate entries, since they're
  visually identical except which echelon letter repeats along the line.
- Rendered as Leaflet `Polyline`/`Polygon` in `MapCanvas.tsx`, persisted to
  `localStorage` separately from point placements (`src/lib/storage.ts`'s
  `loadLines`/`saveLines`).
- Not implemented: repeating the echelon letter along a boundary line's
  full length (the manual repeats it every segment; this app doesn't), and
  the mission-line/restricted-zone bracket end-caps some §2.9 rows draw —
  these render as a plain line/polygon with the correct color and dash
  style, distinguished by name in its popup rather than by a bespoke
  terminator glyph.

## What's not built yet

- Multi-device sync (placements/lines are per-browser `localStorage` only).
- A "rotate" handle for direction-sensitive point symbols (arrows/movement
  icons currently always point the same way).
- Editing a line/area's vertices after drawing it (delete and redraw
  instead).
