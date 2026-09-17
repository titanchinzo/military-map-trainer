import type { PlacedSymbol } from "@/types/symbol";
import type { PlacedLine } from "@/types/line";

export type Role = "admin" | "teacher" | "student";

export const ROLES: Role[] = ["admin", "teacher", "student"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Админ",
  teacher: "Багш",
  student: "Сурагч",
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  updated_at: string;
}

export type Enrollment = {
  teacher_id: string;
  student_id: string;
  created_at: string;
}

/** Газрын зургийн харагдац — «багшийг дагах» горимд хуулбарлагдана. */
export type BoardView = {
  lat: number;
  lng: number;
  zoom: number;
}

export type Board = {
  user_id: string;
  placements: PlacedSymbol[];
  lines: PlacedLine[];
  view: BoardView | null;
  updated_at: string;
}

export type Lesson = {
  teacher_id: string;
  title: string | null;
  is_live: boolean;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * supabase-js-ийн generic-д зориулсан гар бичсэн схем (CLI-гүйгээр).
 *
 * `interface` биш `type` байх ёстой: postgrest-js нь `Tables`-ыг
 * `Record<string, GenericTable>` гэж шаарддаг бөгөөд TypeScript нь зөвхөн type
 * alias-д implicit index signature өгдөг тул interface бичвэл тохирохгүй.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      enrollments: {
        Row: Enrollment;
        Insert: Omit<Enrollment, "created_at"> & { created_at?: string };
        Update: Partial<Enrollment>;
        Relationships: [];
      };
      boards: {
        Row: Board;
        Insert: Partial<Board> & { user_id: string };
        Update: Partial<Board>;
        Relationships: [];
      };
      lessons: {
        Row: Lesson;
        Insert: Partial<Lesson> & { teacher_id: string };
        Update: Partial<Lesson>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
