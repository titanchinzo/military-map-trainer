import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/roles";
import { getMyStudents } from "@/lib/queries";
import LiveBoardView from "@/components/LiveBoardView";

export const metadata = {
  title: "Сурагчийн ажил — Тактикийн тэмдгийн сургалт",
};

export default async function StudentBoardPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { userId } = await requireRole("teacher", "admin");
  const { studentId } = await params;

  // Зөвхөн өөрийн элсүүлсэн сурагчийг нээж болно — RLS давхар хамгаална.
  const students = await getMyStudents(userId);
  const student = students.find((s) => s.id === studentId);
  if (!student) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <Link
          href="/teacher"
          className="text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          ← Багшийн самбар
        </Link>
        <span className="text-sm font-semibold text-zinc-100">
          {student.full_name ?? student.email ?? student.id}
        </span>
      </nav>
      <LiveBoardView
        ownerId={student.id}
        ownerName={student.full_name ?? "Сурагч"}
      />
    </div>
  );
}
