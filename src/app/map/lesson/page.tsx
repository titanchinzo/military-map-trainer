import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getLesson, getMyTeacher } from "@/lib/queries";
import LiveBoardView from "@/components/LiveBoardView";

export const metadata = {
  title: "Багшийн дэлгэц — Тактикийн тэмдгийн сургалт",
};

export default async function LessonPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const teacher = await getMyTeacher(userId);
  if (!teacher) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 p-8 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-lg font-semibold text-zinc-200">
            Та ямар нэг багшид бүртгэгдээгүй байна
          </p>
          <p className="text-sm text-zinc-500">
            Багш тань жагсаалтдаа нэмсний дараа энд түүний хичээлийн дэлгэц
            гарч ирнэ.
          </p>
        </div>
      </div>
    );
  }

  const lesson = await getLesson(teacher.id);

  return (
    <LiveBoardView
      ownerId={teacher.id}
      ownerName={teacher.full_name ?? "Багш"}
      followView
      initiallyLive={Boolean(lesson?.is_live)}
      lessonTitle={lesson?.title ?? null}
      watchLesson
    />
  );
}
