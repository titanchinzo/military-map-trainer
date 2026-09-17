import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Lesson, Profile } from "@/types/db";

/** Сурагчийн багш (нэг сурагч нэг багштай гэж үзнэ; олон бол эхнийх). */
export async function getMyTeacher(studentId: string): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("enrollments")
    .select("teacher_id")
    .eq("student_id", studentId)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.teacher_id)
    .maybeSingle();
  return profile ?? null;
}

/** Багшийн элсүүлсэн сурагчид. */
export async function getMyStudents(teacherId: string): Promise<Profile[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("teacher_id", teacherId);
  const ids = (data ?? []).map((r) => r.student_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids)
    .order("full_name");
  return profiles ?? [];
}

/** Бүртгэлтэй бүх сурагч — багш эндээс сонгож элсүүлнэ. */
export async function getAllStudents(): Promise<Profile[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("full_name");
  return data ?? [];
}

/** Админы хэрэглэгчийн жагсаалт. */
export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("role")
    .order("full_name");
  return data ?? [];
}

export async function getLesson(teacherId: string): Promise<Lesson | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  return data ?? null;
}
