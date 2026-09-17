"use client";

import { useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import type { Database } from "@/types/db";
import {
  IS_SUPABASE_CONFIGURED,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/env";

/**
 * Нэг browser client-ийг бүх апп дундаа хуваалцана — ингэснээр realtime нь
 * ганц WebSocket холболт дээр ажиллана. Clerk-ийн session token-ийг
 * `accessToken` буцаалтаар өгнө (2025-04-01-ээс хойш JWT template хуучирсан).
 */
type ClerkSession = ReturnType<typeof useSession>["session"];

/** Одоогийн Clerk session. Effect дотроос шинэчлэгддэг тул render цэвэр хэвээр. */
const sessionHolder: { current: ClerkSession | null } = { current: null };

let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> | null {
  if (!IS_SUPABASE_CONFIGURED) return null;
  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      // Хүсэлт/subscription бүрд дуудагдана — үргэлж хамгийн сүүлийн session-ыг
      // ашиглах тул токен шинэчлэгдэхэд өөрөө дагаж шинэчлэгдэнэ.
      // Holder нь effect-ээс тавигддаг тул анхны render-т хоосон байж болно;
      // тийм үед Clerk-ийн глобал instance-аас шууд авч, хүсэлт anon эрхээр
      // явахаас сэргийлнэ (RLS түүнийг хоосон үр дүнгээр буцаадаг).
      accessToken: async () => {
        const session =
          sessionHolder.current ??
          (globalThis as { Clerk?: { session?: ClerkSession } }).Clerk?.session;
        return (await session?.getToken()) ?? null;
      },
    });
  }
  return client;
}

/**
 * Realtime-ын холболтод Clerk токеныг тавина.
 *
 * `accessToken` сонголт нь REST хүсэлт бүрд ажилладаг ч realtime-ын хувьд
 * client үүсэх үед НЭГ УДАА async байдлаар тавигддаг. Subscribe түүнээс
 * түрүүлбэл `phx_join` дотор `access_token` орохгүй, холболт anon эрхээр үлдэж,
 * RLS бүх мөрийг таслана — суваг SUBSCRIBED болох хэрнээ ямар ч өөрчлөлт
 * ирэхгүй. Тиймээс subscribe хийхийн өмнө үүнийг заавал await хийнэ.
 */
export async function ensureRealtimeAuth(
  client: SupabaseClient<Database>,
): Promise<void> {
  await client.realtime.setAuth();
}

/** Clerk-ийн токен ~60 секунд амьдардаг тул realtime-ын хуулбарыг шинэчилж байна. */
const REALTIME_AUTH_REFRESH_MS = 30_000;
let authTimer: ReturnType<typeof setInterval> | null = null;

function startRealtimeAuthRefresh(client: SupabaseClient<Database>) {
  if (authTimer) return;
  authTimer = setInterval(() => {
    void client.realtime.setAuth();
  }, REALTIME_AUTH_REFRESH_MS);
}

export function useSupabase(): SupabaseClient<Database> | null {
  const { session, isLoaded } = useSession();
  const client = getClient();

  useEffect(() => {
    sessionHolder.current = session ?? null;
    if (!client || !session) return;
    void client.realtime.setAuth();
    startRealtimeAuthRefresh(client);
  }, [session, client]);

  // Clerk-ийн session ачаалагдтал null буцаана. Эс тэгвээс хуудас ачаалах үеийн
  // анхны select токенгүй (anon) явж, RLS хоосон буцааж, «хичээл эхлээгүй»,
  // «боард хоосон» гэсэн буруу төлөв тогтоно.
  return isLoaded && session ? client : null;
}
