import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/types/db";

function asRole(value: unknown): Role | null {
  return typeof value === "string" && (ROLES as string[]).includes(value)
    ? (value as Role)
    : null;
}

/**
 * Хэрэглэгчийн эрх. Эх сурвалж нь Clerk-ийн `publicMetadata.role`.
 *
 * Clerk dashboard дээр session token-д `{"metadata": "{{user.public_metadata}}"}`
 * гэсэн claim нэмсэн бол DB-д ч, Clerk API-д ч хандалгүй шууд уншина. Тэр
 * тохиргоог хийгээгүй байсан ч ажиллахын тулд Clerk API руу нэг удаа буцаж
 * асууна.
 */
export async function getRole(): Promise<Role | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const claim = asRole(
    (sessionClaims?.metadata as { role?: unknown } | undefined)?.role,
  );
  if (claim) return claim;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return asRole(user.publicMetadata?.role) ?? "student";
}

/** Заасан эрхүүдийн аль нэг нь байхгүй бол буцаана. */
export async function requireRole(...allowed: Role[]): Promise<{
  userId: string;
  role: Role;
}> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const role = (await getRole()) ?? "student";
  if (!allowed.includes(role)) redirect("/map");
  return { userId, role };
}

/**
 * Нэвтэрсэн хэрэглэгчийн `profiles` мөрийг шинэчилнэ — жагсаалт гаргах,
 * realtime-д нэрээр нь холбоход хэрэгтэй. Мөн анхны админыг эндээс үүсгэнэ.
 *
 * Clerk webhook-оор синк хийвэл илүү бат бөх (нэр солигдох, хэрэглэгч
 * устгагдахыг шууд барина) — үүнийг дараагийн алхам болгож үлдээв.
 */
export async function ensureProfile(): Promise<{ userId: string; role: Role } | null> {
  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  let role = asRole(user.publicMetadata?.role);

  // BOOTSTRAP_ADMIN_EMAILS нь тохиргооны түвшний олголт тул одоо байгаа эрхээс
  // ДЭЭГҮҮР үйлчилнэ. Өмнө нь зөвхөн эрхгүй хэрэглэгчид шалгадаг байсан нь
  // алдаатай байв: тухайн хүн энэ хувьсагч тавигдахаас өмнө нэг удаа нэвтэрсэн
  // бол "student" гэж бичигдээд, түүнээс хойш хэзээ ч админ болох боломжгүй
  // болдог байлаа.
  const bootstrap = (process.env.BOOTSTRAP_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && bootstrap.includes(email.toLowerCase())) role = "admin";
  role ??= "student";

  if (asRole(user.publicMetadata?.role) !== role) {
    const client = await clerkClient();
    await client.users.updateUser(user.id, {
      publicMetadata: { ...user.publicMetadata, role },
    });
  }

  const supabase = createAdminSupabase();
  if (supabase) {
    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      email ||
      user.id;
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email,
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }

  return { userId: user.id, role };
}
