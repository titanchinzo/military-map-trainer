import { ensureProfile } from "@/lib/roles";
import { getLesson, getMyTeacher } from "@/lib/queries";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import MapTabs from "@/components/MapTabs";

/**
 * Газрын зургийн хэсгийн бүрхүүл: нэвтэрсэн хэрэглэгчийн `profiles` мөрийг
 * шинэчилж, сурагч бол багштайгаа холбосон табыг харуулна.
 */
export default async function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await ensureProfile();
  const teacher =
    profile && profile.role === "student" ? await getMyTeacher(profile.userId) : null;
  const lesson = teacher ? await getLesson(teacher.id) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!IS_SUPABASE_CONFIGURED && (
        <div className="shrink-0 bg-amber-900/40 px-4 py-1.5 text-center text-xs text-amber-200">
          ⚠ Supabase тохируулаагүй байна — ажил зөвхөн энэ хөтөч дээр хадгалагдах
          бөгөөд багш/сурагчийн шууд холболт идэвхгүй. <code>.env.local</code>-д
          <code className="mx-1">NEXT_PUBLIC_SUPABASE_URL</code>,
          <code className="mx-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> нэмнэ үү.
        </div>
      )}
      <MapTabs
        hasTeacher={Boolean(teacher)}
        teacherName={teacher?.full_name ?? null}
        isLive={Boolean(lesson?.is_live)}
      />
      {children}
    </div>
  );
}
