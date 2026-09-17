import { requireRole } from "@/lib/roles";
import { getAllStudents, getLesson, getMyStudents } from "@/lib/queries";
import { ensureProfile } from "@/lib/roles";
import TeacherDashboard from "@/components/TeacherDashboard";

export const metadata = {
  title: "Багшийн самбар — Тактикийн тэмдгийн сургалт",
};

export default async function TeacherPage() {
  await ensureProfile();
  const { userId } = await requireRole("teacher", "admin");

  const [students, candidates, lesson] = await Promise.all([
    getMyStudents(userId),
    getAllStudents(),
    getLesson(userId),
  ]);

  return (
    <TeacherDashboard
      teacherId={userId}
      students={students}
      candidates={candidates}
      initialLesson={{
        isLive: Boolean(lesson?.is_live),
        title: lesson?.title ?? null,
      }}
    />
  );
}
