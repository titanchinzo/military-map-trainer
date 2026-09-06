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
- **`src/lib/symbols.ts`** — ~150 `SymbolDef` entries transcribed from
  *"Цэргийн тактикийн таних тэмдэг, тэмдэглэгээг хэрэглэх заавар Т4‑2022"*,
  grouped into the categories you see in the sidebar.
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

More importantly: the source PDF's *text layer* only gave me the **names**
of most branch-of-service / weapon / vehicle icons in Chapters 2.4–2.10 and
the appendices — not the actual hand-drawn glyph geometry (that only exists
as pixels in scanned table images I can't vectorize). So for entries flagged
`approximate: true` (shown with a ⚠ note in the app), the **frame shape,
echelon marks, and affiliation color are exact per the manual**, but the
short label inside the frame is a stand-in abbreviation, not the manual's
actual pictorial glyph. Entries without that flag (command-post letter codes
like ЗХЖШ/ХЗЦК/ОБЕГ, plain unit-echelon boxes, cyber/network diagram icons,
MP/ОН/hilийн цэрэг colors) are reproduced exactly as specified. If you have
access to the original vector artwork for the branch icons, I can swap the
placeholders for the real glyphs.

## What's not built yet

- Boundary-line and area/zone symbols (§2.8–2.9 of the manual) — these are
  drawn as lines/polygons, a different interaction than dropping a point
  icon, and were left out of this pass.
- Multi-device sync (placements are per-browser `localStorage` only).
- A "rotate" handle for direction-sensitive symbols (arrows/movement icons
  currently always point the same way).
