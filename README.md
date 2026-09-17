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

## Багш / сурагч / админ (Supabase)

Апп нь гурван эрхтэй: **админ** хэн нь багш, хэн нь сурагч болохыг шийднэ;
**багш** сурагчдаа жагсаалтдаа элсүүлж, хичээл эхлүүлнэ; **сурагч** багшийнхаа
дэлгэцийг шууд хардаг. Эрхийн эх сурвалж нь Clerk-ийн `publicMetadata.role`,
бусад бүх өгөгдөл Supabase Postgres дээр.

### Нэг удаагийн тохиргоо

1. [supabase.com](https://supabase.com) дээр project үүсгэнэ.
2. **Clerk → Supabase холболт** (JWT template 2025-04-01-ээс хойш хуучирсан,
   native third-party auth хэрэглэнэ):
   Clerk Dashboard → Configure → Integrations → Supabase → идэвхжүүлээд гарч
   ирэх Clerk домэйныг Supabase → Authentication → Sign In / Providers →
   Third Party Auth → Clerk дээр буулгана.
3. **Session token-д эрхийг нэмнэ**: Clerk Dashboard → Sessions → Customize
   session token → `{ "metadata": "{{user.public_metadata}}" }`. Ингэснээр
   `proxy.ts` болон RLS хоёулаа DB-д хандалгүй эрхийг уншина. (Энэ алхмыг
   алгасвал апп ажиллана — зүгээр л эрх шалгах бүрд Clerk API руу нэг нэмэлт
   хүсэлт явна.)
4. `supabase/migrations/0001_init.sql`-ийг Supabase → SQL Editor дээр
   бүтнээр нь ажиллуулна (хүснэгт, RLS бодлого, realtime publication).
5. `.env.local`-д `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `BOOTSTRAP_ADMIN_EMAILS` -ыг бөглөнө.

`BOOTSTRAP_ADMIN_EMAILS`-д байгаа и-мэйлээр анх нэвтэрсэн хүн автоматаар админ
болно — цаашид эрхийг `/admin` дээрээс олгоно.

### Хуудаснууд

| Зам | Хэн | Юу |
|---|---|---|
| `/map` | бүгд | Өөрийн зураг. Өөрчлөлт бүр Supabase руу 700мс-ээр throttle хийгдэн бичигдэнэ |
| `/map/lesson` | сурагч | Багшийн хичээлийн дэлгэц, шууд, зөвхөн харах (төв/zoom-ыг нь дагана) |
| `/teacher` | багш, админ | Сурагч элсүүлэх, хичээл эхлүүлэх/зогсоох, сурагчдын ажлын шууд самбар |
| `/teacher/[studentId]` | багш, админ | Нэг сурагчийн зураг бүтэн дэлгэцээр, шууд |
| `/admin` | админ | Хэрэглэгчийн эрх солих |

### Аюулгүй байдал

Хамгаалалт гурван давхаргатай: `src/proxy.ts` (route-ыг session token дахь
эрхээр хаах) → хуудсан дахь `requireRole()` → Postgres RLS. RLS нь эцсийн
шийдвэр гаргагч:

- Сурагч багшийнхаа зургийг **зөвхөн `lessons.is_live` үнэн байхад** уншина.
  Хичээл зогсмогц өгөгдөл нь ч хүрэхээ болино — зөвхөн UI нуудаг биш.
- Багш зөвхөн **өөрийн элсүүлсэн** сурагчийн зургийг уншина.
- `profiles`-ыг зөвхөн service role бичнэ (сервер тал), хэрэглэгч өөрийн эрхээ
  өөрчилж чадахгүй.

Бодлогууд `enrollments`/`lessons` рүү хардаг тул RLS-ийн рекурс үүсэхээс
сэргийлж `is_teacher_of()`, `lesson_is_live()` гэсэн `security definer`
функцээр дамжуулсан.

### Real-time

`boards`, `lessons` хүснэгт `supabase_realtime` publication-д байна. Клиент
Postgres Changes-д subscribe хийнэ (`src/hooks/useLiveBoard.ts`,
`useLiveLesson.ts`). Нэг анги (1 багш + ~30 сурагч) хэмжээнд энэ хангалттай.
Vercel serverless дээр өөрийн WebSocket сервер ажиллуулах боломжгүй тул
холболт нь browser-аас шууд Supabase рүү явна.

Хэмжсэн саатал (dev горим, багшийн бичилтээс сурагчийн DOM хүртэл):
**дундаж ~1 сек**, 232мс–2.8с. Үүн дээр багшийн талын 700мс throttle нэмэгдэнэ.

#### Хоёр анзаарагдахад бэрх алхам

Эдгээрийг алгасвал бүх зүйл «зөв» харагдана — суваг `SUBSCRIBED` болж, алдаа
гарахгүй — гэтэл ямар ч өгөгдөл ирэхгүй. Хоёулаа RLS-ийн хоосон үр дүнгээр
далдлагддаг тул оношлоход хэцүү:

1. **Subscribe хийхийн ӨМНӨ `realtime.setAuth()`-ыг заавал `await` хийнэ**
   (`ensureRealtimeAuth()`). `accessToken` сонголт нь REST хүсэлт бүрд
   ажилладаг ч realtime-д client үүсэх үед нэг удаа async тавигддаг. Subscribe
   түүнээс түрүүлбэл `phx_join` дотор `access_token` орохгүй, холболт **anon**
   эрхээр үлдэж, RLS бүх мөрийг таслана. Clerk-ийн токен ~60 сек амьдардаг тул
   30 секунд тутам дахин тавьж байна.

2. **Clerk-ийн session ачаалагдтал `useSupabase()` нь `null` буцаана.** Эс
   тэгвээс хуудас ачаалах үеийн хамгийн эхний `select` токенгүй явж, RLS хоосон
   буцааж, «хичээл эхлээгүй», «боард хоосон» гэсэн буруу төлөв **тогтож
   үлддэг** (дахин татдаггүй).

### Migration-ууд

| Файл | Юу |
|---|---|
| `0001_init.sql` | Хүснэгт, RLS бодлого, realtime publication |
| `0002_role_from_profiles.sql` | Эрхийг session claim-ээс биш `profiles`-оос уншина (Clerk `publicMetadata`-г token-д анхдагчаар оруулдаггүй) |
| `0003_realtime_publication.sql` | Publication-ыг найдвартай болгож, `replica identity full` тавина |

Supabase тохируулаагүй бол апп **хуучин `localStorage` горимоороо** ажиллана
(нэг хүний хэрэгсэл), дээд талд анхааруулга гарна. Анх Supabase холбогдоход
локал ажил нэг удаа автоматаар зөөгдөнө.

## How it works

- **`src/proxy.ts`** — Next.js 16 renamed `middleware.ts` → `proxy.ts`. Wraps
  Clerk's `clerkMiddleware`; every route except `/`, `/sign-in`, `/sign-up`
  requires a session.
- **`src/lib/symbols.ts`** — 776 `SymbolDef` entries transcribed from all 82
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
- **`src/lib/lineTypes.ts`** — 82 `LineTypeDef` entries for §2.8 boundary
  lines, §2.9 areas / mission lines / recon and deployment lines, and the
  Хавсралт 17 border-troop boundaries. These are drawn on the map rather than
  dropped as markers.
- **`src/lib/renderSymbol.ts`** — draws a symbol as SVG from its frame shape
  (§1.5), echelon mark (§1.4), and affiliation color (§1.7, exact RGB values
  from the manual's table). Used both for palette thumbnails and Leaflet
  marker icons, so they always match. **Size follows §1.8 Хүснэгт 3**: a unit
  frame's width is set by its echelon (хороо 20 mm > батальон 16 > рот 14 at
  1:50 000; бригад/дивиз/арми above, салаа/тасаг/бүлэг below per §1.8.2),
  every frame is 2:1, and `MM_PX` converts paper millimetres to screen pixels
  (fixed, not zoom-dependent — just as on paper). Two frame shapes exist
  beyond the §1.5 four: `flag` (§2.1 command posts — the frame on a staff
  whose foot marks the position, so the marker is anchored there) and
  `yatsbm` (§1.3.3 / §2.3 — салаа, тасаг, бүлэг are drawn as the ЯЦБМ
  outline with the echelon letter *inside*, not as a rectangle with the mark
  above). Symbols carrying a transcribed `glyph` render as bare line art.
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
Lines need ≥2 points, areas ≥3 (auto-closed into a polygon); the draw
banner shows the running vertex count and keeps "Дуусгах" disabled until the
shape can actually be closed, instead of silently ignoring the click. The
draft vertices live in `MapShell` (not `MapCanvas`) so that banner can see
them. Click a drawn
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

## Coverage audit against the printed manual (Sep 2026)

**The whole manual has now been reconciled** — chapter 2 first, then appendices
1–19 (the printed body numbers 19 appendices even though the contents page
lists 13 groups). The catalog went 560 → 776 symbols and 58 → 82 line/area
types.

The PDF *does* have a usable Cyrillic text layer, contrary to an earlier note
here: `pdftotext -layout` extracts the "Агуулга" column cleanly. That made it
possible to diff the manual's contents against the catalog by name instead of
reading 82 page images, though the images were still needed to draw each
glyph. Two traps when doing this again:

- Descriptions wrap over several lines, so a naive line-per-symbol reading
  triple-counts the long ones. Join a line onto the previous when it starts
  lowercase or the previous has an unclosed `(`.
- The appendices re-list symbols that chapter 2 already defines (vehicles in
  Хавсралт 12, aerodromes in Хавсралт 2). Match against the *whole* catalog,
  not the one category, or they look missing.

What the appendices added: Хавсралт 5 communications stations (+16), 11–14
supply and medical (+46), 16 metrology labs (+2), 18 emergency-service and
weather (+28), 19 police and internal troops (+28), 6 cyber/network (+33),
2 radar altitude bands (+9), plus stragglers. Х1, Х4 and Х15 were already
complete. Appendix lines and areas (районууд, заагууд) went to `lineTypes.ts`
where they belong, not `symbols.ts`.

## Earlier coverage note (chapter 2)

Chapter 2 was reconciled page by page: §2.1–§2.4 and §2.8–§2.9 were already
complete; §2.5 (+7: тогтоон барих, маневр, байлдаанаас гарах, цэвэрлэгээ,
цөмлөлт, самналт, хаалт), §2.6 (+11 fire symbols incl. all хаалт гал
variants, бөөгнөрүүлсэн гал, галын давлагаа, шатаах зэвсгийн цохилт), §2.7
(+4: аяны журам, салаа/тасаг/бүлгийн давшилт) and §2.10 (+32: the full gun,
howitzer, mortar and air-defence ladder of Хүснэгт 14, автобус/цасны
мотоцикл/цана, four more aircraft) were missing and are now in. Appendices 1–3
were spot-checked complete; the remaining appendices were transcribed by the
earlier pass and not re-audited line by line.

`src/lib/glossary.ts` also carries БД-2/100 definitions (хориглолт, давшилт,
тулгарах, тогтоон барих, маневрын хориглолт, түйвээх, тулгуурт байр,
хариуцлагын/сонирхлын/шууд хөнөөлийн бүс, журмууд, марш) and its size norms
(батальоны байрлалын район ≤ 10 км², ЯЦБМ хооронд 100 м, салаа хооронд
300 м, цуваанд машин хооронд 25–50 м), which the matching §2.9 area symbols
quote in their popups.

## What's not built yet

- Multi-device sync (placements/lines are per-browser `localStorage` only).
- A "rotate" handle for direction-sensitive point symbols (arrows/movement
  icons currently always point the same way).
- Editing a line/area's vertices after drawing it (delete and redraw
  instead).
