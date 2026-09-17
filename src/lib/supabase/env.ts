/** Supabase-ийн орчны хувьсагчид. Түлхүүр байхгүй үед апп нурахгүйгээр
 * "тохируулаагүй" гэж мэдэгдэхийн тулд энд төвлөрүүлэв. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Supabase энэ түлхүүрийг "publishable" болгож нэрлэсэн; хуучин төслүүдэд
 * "anon" нэрээр байдаг тул хоёуланг нь хүлээж авна. */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const IS_SUPABASE_CONFIGURED = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);
