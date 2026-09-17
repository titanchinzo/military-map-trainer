-- Тактикийн тэмдгийн сургалт — багш / сурагч / админ бүтэц.
--
-- Clerk-ийг Supabase-ийн third-party auth provider болгон холбосон тул
-- session token шууд ирнэ:
--   auth.jwt()->>'sub'              = Clerk user id
--   auth.jwt()->'metadata'->>'role' = publicMetadata.role (Clerk dashboard дээр
--                                     session token-д нэмсэн custom claim)

-- ─────────────────────────── Туслах функцууд ───────────────────────────

create or replace function public.clerk_uid() returns text
  language sql stable
  as $$ select auth.jwt()->>'sub' $$;

create or replace function public.clerk_role() returns text
  language sql stable
  as $$ select coalesce(auth.jwt()->'metadata'->>'role', 'student') $$;

-- ─────────────────────────── Хүснэгтүүд ───────────────────────────

create table if not exists public.profiles (
  id         text primary key,                        -- Clerk user id
  email      text,
  full_name  text,
  role       text not null default 'student'
             check (role in ('admin', 'teacher', 'student')),
  updated_at timestamptz not null default now()
);

-- Нэг багш = нэг сурагчийн жагсаалт.
create table if not exists public.enrollments (
  teacher_id text not null references public.profiles(id) on delete cascade,
  student_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);
create index if not exists enrollments_student_idx on public.enrollments (student_id);

-- Хэрэглэгч бүрт нэг ажлын зураг. Багшийнх нь хичээлийн дэлгэц болж давхар үүрэг гүйцэтгэнэ.
create table if not exists public.boards (
  user_id    text primary key references public.profiles(id) on delete cascade,
  placements jsonb not null default '[]'::jsonb,
  lines      jsonb not null default '[]'::jsonb,
  view       jsonb,                                   -- {lat, lng, zoom}
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  teacher_id text primary key references public.profiles(id) on delete cascade,
  title      text,
  is_live    boolean not null default false,
  started_at timestamptz,
  ended_at   timestamptz
);

-- ── Бодлогод RLS-ийн рекурс үүсэхээс сэргийлэхийн тулд security definer ──
-- (бодлогын дотор хийсэн select нь мөн RLS-д шүүгдэх тул).

create or replace function public.is_teacher_of(p_teacher text, p_student text)
  returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (
    select 1 from public.enrollments
    where teacher_id = p_teacher and student_id = p_student
  ) $$;

create or replace function public.lesson_is_live(p_teacher text)
  returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (
    select 1 from public.lessons where teacher_id = p_teacher and is_live
  ) $$;

-- ─────────────────────────── RLS ───────────────────────────
-- Бичих эрхийг бүх хүснэгтэд хатуу барина: profiles-ыг зөвхөн service role
-- (сервер тал) бичнэ, бусдыг нь эзэмшигч нь өөрөө.

alter table public.profiles    enable row level security;
alter table public.enrollments enable row level security;
alter table public.boards      enable row level security;
alter table public.lessons     enable row level security;

-- profiles: багш/админ бүгдийг хардаг (сурагч сонгоход хэрэгтэй);
-- сурагч зөвхөн өөрийгөө болон багшаа хардаг.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = public.clerk_uid()
    or public.clerk_role() in ('teacher', 'admin')
    or public.is_teacher_of(id, public.clerk_uid())
  );

-- enrollments: багш өөрийн жагсаалтаа удирдана, сурагч өөрийгөө хардаг.
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select
  using (
    teacher_id = public.clerk_uid()
    or student_id = public.clerk_uid()
    or public.clerk_role() = 'admin'
  );

drop policy if exists enrollments_insert on public.enrollments;
create policy enrollments_insert on public.enrollments for insert
  with check (
    teacher_id = public.clerk_uid()
    and public.clerk_role() in ('teacher', 'admin')
  );

drop policy if exists enrollments_delete on public.enrollments;
create policy enrollments_delete on public.enrollments for delete
  using (teacher_id = public.clerk_uid() or public.clerk_role() = 'admin');

-- boards: өөрийн зургаа бүрэн эрхтэй; багш нь элсүүлсэн сурагчийнхаа зургийг
-- хардаг; сурагч нь багшийнхаа зургийг ЗӨВХӨН хичээл явж байх үед хардаг.
drop policy if exists boards_select on public.boards;
create policy boards_select on public.boards for select
  using (
    user_id = public.clerk_uid()
    or public.is_teacher_of(public.clerk_uid(), user_id)
    or (
      public.is_teacher_of(user_id, public.clerk_uid())
      and public.lesson_is_live(user_id)
    )
    or public.clerk_role() = 'admin'
  );

drop policy if exists boards_insert on public.boards;
create policy boards_insert on public.boards for insert
  with check (user_id = public.clerk_uid());

drop policy if exists boards_update on public.boards;
create policy boards_update on public.boards for update
  using (user_id = public.clerk_uid())
  with check (user_id = public.clerk_uid());

drop policy if exists boards_delete on public.boards;
create policy boards_delete on public.boards for delete
  using (user_id = public.clerk_uid());

-- lessons: багш өөрийн хичээлээ удирдана, элсэгдсэн сурагчид харна.
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select
  using (
    teacher_id = public.clerk_uid()
    or public.is_teacher_of(teacher_id, public.clerk_uid())
    or public.clerk_role() = 'admin'
  );

drop policy if exists lessons_insert on public.lessons;
create policy lessons_insert on public.lessons for insert
  with check (
    teacher_id = public.clerk_uid()
    and public.clerk_role() in ('teacher', 'admin')
  );

drop policy if exists lessons_update on public.lessons;
create policy lessons_update on public.lessons for update
  using (teacher_id = public.clerk_uid())
  with check (teacher_id = public.clerk_uid());

-- ─────────────────────────── Realtime ───────────────────────────
-- boards, lessons-ийн өөрчлөлтийг клиент рүү дамжуулна. Хоёулангийнх нь RLS
-- бодлого зөвхөн primary key багана (user_id / teacher_id)-аар шүүдэг тул
-- анхдагч replica identity хангалттай.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'boards'
  ) then
    alter publication supabase_realtime add table public.boards;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lessons'
  ) then
    alter publication supabase_realtime add table public.lessons;
  end if;
end $$;
