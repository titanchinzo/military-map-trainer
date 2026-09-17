import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import {
  IS_SUPABASE_CONFIGURED,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/env";

/** Хэрэглэгчийн эрхээр (RLS үйлчилнэ) ажиллах сервер талын client. */
export async function createServerSupabase(): Promise<SupabaseClient<Database> | null> {
  if (!IS_SUPABASE_CONFIGURED) return null;
  const { getToken } = await auth();
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: () => getToken(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * RLS-ийг тойрдог client. `profiles`-ыг бичих цорын ганц зам бөгөөд ЗӨВХӨН
 * сервер талд ажиллана — түлхүүр нь NEXT_PUBLIC_ угтваргүй тул browser bundle
 * руу хэзээ ч орохгүй (TESSADEM_API_KEY-тэй ижил зарчим).
 */
export function createAdminSupabase(): SupabaseClient<Database> | null {
  // Supabase энэ түлхүүрийг "secret key" болгож нэрлэсэн; хуучин төслүүдэд
  // "service role key" нэрээр байдаг тул хоёуланг нь хүлээж авна.
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !serviceKey) return null;
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
