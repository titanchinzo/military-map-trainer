import { NextResponse, type NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getRole } from "@/lib/roles";
import { createAdminSupabase } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/types/db";

/**
 * Хэрэглэгчийн эрхийг солих цорын ганц зам.
 *
 * Эрхийн эх сурвалж нь Clerk-ийн `publicMetadata.role` тул энэ үйлдэл заавал
 * сервер талаар (Clerk Backend API-гаар) явна; `profiles` дахь хуулбарыг мөн
 * эндээс шинэчилнэ.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });
  }
  if ((await getRole()) !== "admin") {
    return NextResponse.json(
      { error: "Зөвхөн админ эрх өөрчилнө." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    role?: unknown;
  } | null;

  const targetId = typeof body?.userId === "string" ? body.userId : null;
  const role =
    typeof body?.role === "string" && (ROLES as string[]).includes(body.role)
      ? (body.role as Role)
      : null;

  if (!targetId || !role) {
    return NextResponse.json(
      { error: "userId болон role (admin | teacher | student) шаардлагатай." },
      { status: 400 },
    );
  }

  // Сүүлчийн админ өөрийгөө буулгаад систем эзэнгүй үлдэхээс сэргийлнэ.
  if (targetId === userId && role !== "admin") {
    return NextResponse.json(
      { error: "Өөрийнхөө админ эрхийг хасах боломжгүй." },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const target = await client.users.getUser(targetId).catch(() => null);
  if (!target) {
    return NextResponse.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  }

  await client.users.updateUser(targetId, {
    publicMetadata: { ...target.publicMetadata, role },
  });

  const supabase = createAdminSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", targetId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, userId: targetId, role });
}
