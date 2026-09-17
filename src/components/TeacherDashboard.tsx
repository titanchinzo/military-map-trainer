"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import BoardThumbnail from "@/components/BoardThumbnail";
import { useSupabase } from "@/lib/supabase/client";
import { useLiveBoards } from "@/hooks/useLiveBoard";
import { useLiveLesson } from "@/hooks/useLiveLesson";
import { EMPTY_BOARD } from "@/lib/boards";
import type { Profile } from "@/types/db";

/**
 * Багшийн ажлын самбар: сурагчдаа элсүүлэх, хичээл эхлүүлэх/зогсоох, элсүүлсэн
 * сурагчдын ажлыг шууд (real-time) хянах.
 */
export default function TeacherDashboard({
  teacherId,
  students,
  candidates,
  initialLesson,
}: {
  teacherId: string;
  students: Profile[];
  /** Бүртгэлтэй бүх сурагч — эндээс сонгож элсүүлнэ. */
  candidates: Profile[];
  initialLesson: { isLive: boolean; title: string | null };
}) {
  const router = useRouter();
  const supabase = useSupabase();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialLesson.title ?? "");
  const [query, setQuery] = useState("");

  const lesson = useLiveLesson(supabase, teacherId, initialLesson);
  const boards = useLiveBoards(
    supabase,
    students.map((s) => s.id),
  );

  const enrolledIds = new Set(students.map((s) => s.id));
  const q = query.trim().toLowerCase();
  const available = candidates.filter(
    (c) =>
      !enrolledIds.has(c.id) &&
      (!q ||
        (c.full_name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)),
  );

  function run(action: () => Promise<{ error: { message: string } | null }>) {
    setError(null);
    void (async () => {
      const { error: err } = await action();
      if (err) {
        setError(err.message);
        return;
      }
      startTransition(() => router.refresh());
    })();
  }

  function enroll(studentId: string) {
    if (!supabase) return;
    run(async () =>
      supabase
        .from("enrollments")
        .insert({ teacher_id: teacherId, student_id: studentId }),
    );
  }

  function unenroll(studentId: string) {
    if (!supabase) return;
    run(async () =>
      supabase
        .from("enrollments")
        .delete()
        .eq("teacher_id", teacherId)
        .eq("student_id", studentId),
    );
  }

  function toggleLesson() {
    if (!supabase) return;
    const now = new Date().toISOString();
    run(async () =>
      supabase.from("lessons").upsert(
        lesson.isLive
          ? { teacher_id: teacherId, is_live: false, ended_at: now }
          : {
              teacher_id: teacherId,
              is_live: true,
              title: title.trim() || null,
              started_at: now,
              ended_at: null,
            },
        { onConflict: "teacher_id" },
      ),
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">Багшийн самбар</h1>
            <p className="text-sm text-zinc-500">
              Сурагчдаа элсүүлж, хичээлээ эхлүүлээд, ажлыг нь шууд хянана.
            </p>
          </div>
          <Link
            href="/map"
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Миний зураг руу
          </Link>
        </header>

        {error && (
          <p className="rounded-md bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* ── Хичээл удирдах ── */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold ${
                lesson.isLive ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {lesson.isLive && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              )}
              {lesson.isLive ? "ШУУД ЯВЖ БАЙНА" : "Хичээл эхлээгүй"}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Хичээлийн сэдэв (заавал биш)"
              disabled={lesson.isLive}
              className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={toggleLesson}
              disabled={!supabase || pending}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                lesson.isLive
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {lesson.isLive ? "Хичээл зогсоох" : "Хичээл эхлүүлэх"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Хичээл явж байх үед таны «Миний зураг» дээрх өөрчлөлт бүр элсүүлсэн
            сурагчдын «Багшийн дэлгэц» таб руу шууд дамжина. Зогсоомогц харагдахаа
            болино.
          </p>
        </section>

        {/* ── Сурагчдын ажил ── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Миний сурагчид ({students.length})
          </h2>
          {students.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
              Сурагч элсүүлээгүй байна. Доорх жагсаалтаас сонгож нэмнэ үү.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => {
                const board = boards[student.id] ?? EMPTY_BOARD;
                return (
                  <div
                    key={student.id}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                          {student.full_name ?? student.email ?? student.id}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {student.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unenroll(student.id)}
                        disabled={pending}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                        title="Жагсаалтаас хасах"
                      >
                        Хасах
                      </button>
                    </div>
                    <BoardThumbnail board={board} className="h-24 w-full" />
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {board.placements.length} тэмдэг · {board.lines.length} шугам
                      </span>
                      <Link
                        href={`/teacher/${student.id}`}
                        className="font-medium text-blue-400 hover:text-blue-300"
                      >
                        Нээх →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Сурагч элсүүлэх ── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Сурагч элсүүлэх
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Нэр, и-мэйлээр хайх…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
          />
          {available.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Элсүүлэх боломжтой сурагч олдсонгүй. Админ эхлээд хэрэглэгчид
              «Сурагч» эрх олгосон байх шаардлагатай.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900">
              {available.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">
                      {c.full_name ?? c.id}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">{c.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => enroll(c.id)}
                    disabled={!supabase || pending}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    Элсүүлэх
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
