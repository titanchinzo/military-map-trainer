"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Lesson } from "@/types/db";
import { ensureRealtimeAuth } from "@/lib/supabase/client";

/**
 * Багшийн хичээлийн төлөвийг шууд дагана. RLS-ийн улмаас зөвхөн тухайн багшид
 * элсэгдсэн сурагч (болон багш өөрөө) энэ мөрийг харна.
 */
export function useLiveLesson(
  supabase: SupabaseClient<Database> | null,
  teacherId: string | null,
  initial: { isLive: boolean; title: string | null },
): { isLive: boolean; title: string | null } {
  const key = supabase && teacherId ? teacherId : "";
  const [state, setState] = useState<{
    key: string;
    isLive: boolean;
    title: string | null;
  } | null>(null);

  useEffect(() => {
    if (!supabase || !key) return;
    let cancelled = false;

    const apply = (row: Partial<Lesson> | null | undefined) => {
      if (cancelled) return;
      setState({
        key,
        isLive: Boolean(row?.is_live),
        title: row?.title ?? null,
      });
    };

    void supabase
      .from("lessons")
      .select("*")
      .eq("teacher_id", key)
      .maybeSingle()
      .then(({ data }) => apply(data));

    let channel: ReturnType<typeof supabase.channel> | null = null;
    void ensureRealtimeAuth(supabase).then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`lesson:${key}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "lessons",
            filter: `teacher_id=eq.${key}`,
          },
          (payload) =>
            apply(
              payload.eventType === "DELETE"
                ? null
                : (payload.new as Partial<Lesson>),
            ),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, key]);

  // Subscription ирэх хүртэл серверээс ирсэн анхны утгыг харуулна.
  return state?.key === key
    ? { isLive: state.isLive, title: state.title }
    : initial;
}
