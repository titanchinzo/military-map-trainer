"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { boardFromRow, EMPTY_BOARD, type BoardState } from "@/lib/boards";
import { ensureRealtimeAuth } from "@/lib/supabase/client";

type BoardRow = Database["public"]["Tables"]["boards"]["Row"];

/**
 * Өөр хүний зургийг шууд (real-time) дагана: эхлээд нэг удаа татаж аваад,
 * дараа нь тухайн мөрийн postgres өөрчлөлтөд бүртгүүлнэ.
 *
 * RLS нь энд эцсийн хамгаалалт: багш зөвхөн элсүүлсэн сурагчийнхаа, сурагч
 * зөвхөн хичээл явж байх үед багшийнхаа мөрийг харна. Эрхгүй бол subscription
 * ямар ч мөр дамжуулахгүй.
 *
 * Төлөвийг ачаалсан түлхүүртэй нь хамт хадгалдаг тул эх сурвалж солигдоход
 * effect дотор setState дуудалгүйгээр шууд хоосон рүү шилждэг.
 */
export function useLiveBoard(
  supabase: SupabaseClient<Database> | null,
  userId: string | null,
): { board: BoardState; loading: boolean } {
  const key = supabase && userId ? userId : "";
  const [state, setState] = useState<{ key: string; board: BoardState } | null>(
    null,
  );

  useEffect(() => {
    if (!supabase || !key) return;
    let cancelled = false;

    void supabase
      .from("boards")
      .select("*")
      .eq("user_id", key)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setState({ key, board: boardFromRow(data) });
      });

    // Токеныг тавьсны ДАРАА subscribe — эс тэгвээс холболт anon эрхтэй үлдэнэ.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void ensureRealtimeAuth(supabase).then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`board:${key}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "boards",
            filter: `user_id=eq.${key}`,
          },
          (payload) => {
            if (cancelled) return;
            setState({
              key,
              board:
                payload.eventType === "DELETE"
                  ? EMPTY_BOARD
                  : boardFromRow(payload.new as Partial<BoardRow>),
            });
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, key]);

  const fresh = state?.key === key;
  return {
    board: fresh ? state.board : EMPTY_BOARD,
    loading: key !== "" && !fresh,
  };
}

/**
 * Олон хүний зургийг зэрэг дагана (багшийн сурагчдын самбар). Нэг суваг дээр
 * `user_id=in.(...)` шүүлтээр бүгдийг барина.
 */
export function useLiveBoards(
  supabase: SupabaseClient<Database> | null,
  userIds: string[],
): Record<string, BoardState> {
  // Массив бүрд шинэ reference ирдэг тул агуулгаар нь түлхүүр үүсгэж,
  // subscription дэмий дахин үүсэхээс сэргийлнэ.
  const key = supabase ? userIds.slice().sort().join(",") : "";
  const [state, setState] = useState<{
    key: string;
    boards: Record<string, BoardState>;
  } | null>(null);

  useEffect(() => {
    if (!supabase || !key) return;
    const ids = key.split(",");
    let cancelled = false;

    void supabase
      .from("boards")
      .select("*")
      .in("user_id", ids)
      .then(({ data }) => {
        if (cancelled) return;
        const boards: Record<string, BoardState> = {};
        for (const row of data ?? []) boards[row.user_id] = boardFromRow(row);
        setState({ key, boards });
      });

    let channel: ReturnType<typeof supabase.channel> | null = null;
    void ensureRealtimeAuth(supabase).then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`boards:${key}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "boards",
            filter: `user_id=in.(${ids.join(",")})`,
          },
          (payload) => {
            if (cancelled) return;
            const row = (
              payload.eventType === "DELETE" ? payload.old : payload.new
            ) as Partial<BoardRow> | undefined;
            const id = row?.user_id;
            if (!id) return;
            setState((prev) => ({
              key,
              boards: {
                ...(prev?.key === key ? prev.boards : {}),
                [id]:
                  payload.eventType === "DELETE"
                    ? EMPTY_BOARD
                    : boardFromRow(row),
              },
            }));
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, key]);

  return state?.key === key ? state.boards : {};
}
