"use client";

import MapShell from "@/components/MapShell";
import { useSupabase } from "@/lib/supabase/client";
import { useLiveBoard } from "@/hooks/useLiveBoard";
import { useLiveLesson } from "@/hooks/useLiveLesson";

/**
 * Өөр хүний зургийг шууд дагаж, зөвхөн харах горимоор үзүүлнэ — сурагчид
 * багшийн хичээлийн дэлгэцийг, багш нь сурагчийн ажлыг үүгээр хардаг.
 */
export default function LiveBoardView({
  ownerId,
  ownerName,
  followView = false,
  watchLesson = false,
  initiallyLive = false,
  lessonTitle = null,
}: {
  ownerId: string;
  ownerName: string;
  /** Эзэмшигчийн газрын зургийн төв, zoom-ыг давхар дагах эсэх. */
  followView?: boolean;
  /** Хичээлийн төлөвийг дагаж, идэвхгүй үед зураг харуулахгүй байх эсэх. */
  watchLesson?: boolean;
  initiallyLive?: boolean;
  lessonTitle?: string | null;
}) {
  const supabase = useSupabase();
  const { board } = useLiveBoard(supabase, ownerId);
  const lesson = useLiveLesson(supabase, watchLesson ? ownerId : null, {
    isLive: initiallyLive,
    title: lessonTitle,
  });

  if (watchLesson && !lesson.isLive) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 p-8 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-lg font-semibold text-zinc-200">
            Хичээл эхлээгүй байна
          </p>
          <p className="text-sm text-zinc-500">
            {ownerName} хичээлээ эхлүүлэхэд энэ дэлгэц дээр түүний зураг шууд
            гарч ирнэ. Тэр хүртэл «Миний ажил» таб дээрээ дасгал хийж болно.
          </p>
        </div>
      </div>
    );
  }

  return (
    <MapShell
      readOnly
      remoteBoard={board}
      followView={followView}
      banner={
        <div className="pointer-events-auto flex items-center gap-2 rounded-md bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <span>
            {watchLesson ? "Хичээл явж байна" : "Шууд харж байна"} — {ownerName}
            {lesson.title ? ` · ${lesson.title}` : ""}
          </span>
        </div>
      }
    />
  );
}
