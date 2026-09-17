"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BoardView } from "@/types/db";
import type { PlacedSymbol } from "@/types/symbol";
import type { PlacedLine } from "@/types/line";
import { boardFromRow, isEmptyBoard } from "@/lib/boards";
import { loadPlacements, loadLines, savePlacements, saveLines } from "@/lib/storage";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/env";

/** Хичээлийн үед дэлгэц хэт олон удаа шинэчлэхгүйн тулд бичилтийг хязгаарлана. */
const SAVE_THROTTLE_MS = 700;

interface LoadedBoard {
  /** Аль хэрэглэгчийнхийг ачаалсан бэ — эх сурвалж солигдоход шууд ялгагдана. */
  key: string;
  placements: PlacedSymbol[];
  lines: PlacedLine[];
  view: BoardView | null;
}

/**
 * Хэрэглэгчийн өөрийн зураг: Supabase-аас ачаалж, өөрчлөлт бүрийг throttle
 * хийсэн upsert-ээр буцаан бичнэ. Багшийн хувьд яг энэ мөр нь хичээлийн
 * дэлгэц болох тул бичилт нь сурагчдад шууд хүрнэ.
 *
 * Supabase тохируулаагүй үед `localStorage` дээр хуучин байдлаараа ажиллана.
 */
export function useOwnBoard(
  supabase: SupabaseClient<Database> | null,
  userId: string | null,
) {
  const key = userId ?? "";
  const [state, setState] = useState<LoadedBoard | null>(null);

  const stateRef = useRef<LoadedBoard | null>(null);
  const supabaseRef = useRef(supabase);
  /** Хамгийн сүүлд бичигдсэн утга — ачаалсны дараа дэмий бичихээс сэргийлнэ. */
  const savedRef = useRef<LoadedBoard | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    supabaseRef.current = supabase;
  }, [supabase]);

  // ── ачаалах ──
  useEffect(() => {
    if (!key) return;
    // Supabase тохируулсан хэрнээ client хараахан бэлэн биш бол (Clerk-ийн
    // session ачаалагдаж байна) хүлээнэ — localStorage руу унавал алсын ажлыг
    // хоосноор дарж магадгүй.
    if (IS_SUPABASE_CONFIGURED && !supabase) return;
    let cancelled = false;

    void (async () => {
      let loaded: LoadedBoard;

      if (!supabase) {
        // Supabase тохируулаагүй — хуучин localStorage зан төлөв.
        loaded = await Promise.resolve({
          key,
          placements: loadPlacements(key),
          lines: loadLines(key),
          view: null,
        });
      } else {
        const { data } = await supabase
          .from("boards")
          .select("*")
          .eq("user_id", key)
          .maybeSingle();
        if (cancelled) return;
        const remote = boardFromRow(data);
        loaded = { key, ...remote };

        // Нэг удаагийн шилжилт: алсад хоосон, локалд ажил байвал түүнийг авчирна.
        if (isEmptyBoard(remote)) {
          const placements = loadPlacements(key);
          const lines = loadLines(key);
          if (placements.length || lines.length) {
            loaded = { ...loaded, placements, lines };
            await supabase
              .from("boards")
              .upsert({ user_id: key, placements, lines }, { onConflict: "user_id" });
          }
        }
      }

      if (cancelled) return;
      savedRef.current = loaded;
      setState(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, key]);

  // ── throttle хийсэн бичилт ──
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef(0);

  const flush = useCallback(() => {
    timerRef.current = null;
    const current = stateRef.current;
    if (!current) return;
    savedRef.current = current;
    lastSaveRef.current = Date.now();

    const client = supabaseRef.current;
    if (!client) {
      savePlacements(current.key, current.placements);
      saveLines(current.key, current.lines);
      return;
    }
    void client
      .from("boards")
      .upsert(
        {
          user_id: current.key,
          placements: current.placements,
          lines: current.lines,
          view: current.view,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .then(({ error }) => {
        // Чимээгүй унахаас сэргийлнэ: RLS татгалзах, сүлжээ тасрахыг шууд харуулна.
        if (error) console.error("[mmt] боард хадгалахад алдаа:", error.message);
      });
  }, []);

  useEffect(() => {
    if (!state || state.key !== key) return;
    const saved = savedRef.current;
    // Ачаалсан утгаа шууд буцааж бичихгүй — зөвхөн бодит өөрчлөлтийг хадгална.
    if (
      saved &&
      saved.key === state.key &&
      saved.placements === state.placements &&
      saved.lines === state.lines &&
      saved.view === state.view
    ) {
      return;
    }
    if (timerRef.current) return;
    const wait = Math.max(0, SAVE_THROTTLE_MS - (Date.now() - lastSaveRef.current));
    timerRef.current = setTimeout(flush, wait);
  }, [state, key, flush]);

  // Хуудас солигдоход сүүлийн өөрчлөлт алдагдахгүй байх.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        flush();
      }
    };
  }, [flush]);

  const update = useCallback((patch: (prev: LoadedBoard) => LoadedBoard) => {
    setState((prev) => (prev ? patch(prev) : prev));
  }, []);

  const setPlacements = useCallback<Dispatch<SetStateAction<PlacedSymbol[]>>>(
    (action) =>
      update((prev) => ({
        ...prev,
        placements: typeof action === "function" ? action(prev.placements) : action,
      })),
    [update],
  );

  const setLines = useCallback<Dispatch<SetStateAction<PlacedLine[]>>>(
    (action) =>
      update((prev) => ({
        ...prev,
        lines: typeof action === "function" ? action(prev.lines) : action,
      })),
    [update],
  );

  const setView = useCallback(
    (next: BoardView) =>
      update((prev) =>
        prev.view &&
        Math.abs(prev.view.lat - next.lat) < 1e-6 &&
        Math.abs(prev.view.lng - next.lng) < 1e-6 &&
        prev.view.zoom === next.zoom
          ? prev
          : { ...prev, view: next },
      ),
    [update],
  );

  const fresh = state?.key === key ? state : null;
  return {
    placements: fresh?.placements ?? [],
    lines: fresh?.lines ?? [],
    view: fresh?.view ?? null,
    loading: key !== "" && !fresh,
    setPlacements,
    setLines,
    setView,
  };
}
