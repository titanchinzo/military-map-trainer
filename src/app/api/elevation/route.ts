import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// In-memory per-instance cache so repeated drags near the same spot don't
// burn TessaDEM request balance. Keyed to ~11m precision (4 decimal places).
const cache = new Map<string, { elevation: number | null; at: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat and lon query params are required numbers" },
      { status: 400 },
    );
  }

  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ elevation: cached.elevation, unit: "m", cached: true });
  }

  const apiKey = process.env.TESSADEM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TESSADEM_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  const url = `https://tessadem.com/api/elevation?key=${encodeURIComponent(apiKey)}&locations=${lat},${lon}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const balance = res.headers.get("Request-Balance");
    const data = (await res.json().catch(() => null)) as
      | { results?: { elevation: number }[]; error?: { type: string; message: string } }
      | null;

    if (!res.ok || !data || data.error) {
      const message =
        data?.error?.message ??
        (res.status === 429
          ? "Хүсэлтийн эрх дууссан байна."
          : "TessaDEM-с өндрийн мэдээлэл татахад алдаа гарлаа.");
      return NextResponse.json(
        { error: message, balance },
        { status: res.status || 502 },
      );
    }

    const elevation = data.results?.[0]?.elevation ?? null;
    cache.set(cacheKey, { elevation, at: Date.now() });

    return NextResponse.json({ elevation, unit: "m", balance });
  } catch {
    return NextResponse.json(
      { error: "TessaDEM API-тай холбогдож чадсангүй." },
      { status: 502 },
    );
  }
}
