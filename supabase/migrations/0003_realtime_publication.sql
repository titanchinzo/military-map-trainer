-- Realtime хүргэлтийг засах.
--
-- 0001-д хийсэн DO block нь хүснэгтүүдийг `supabase_realtime` publication-д
-- нэмэх ёстой байсан ч бодит байдалд event ирээгүй (суваг SUBSCRIBED болсон
-- хэрнээ өөрчлөлт дамжаагүй). Энд publication байхгүй бол үүсгэж, хүснэгтүүдээ
-- найдвартай нэмээд, эцсийн байдлыг буцаана.

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array['boards', 'lessons'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Realtime нь UPDATE/DELETE үед RLS бодлогыг шалгахдаа хуучин мөрийг
-- шаарддаг. Анхдагч replica identity нь зөвхөн primary key-г WAL-д бичдэг тул
-- бүтэн мөрийг бичүүлнэ. Эдгээр нь жижиг хүснэгт учир WAL-ын нэмэлт ачаалал
-- ач холбогдолгүй.
alter table public.boards  replica identity full;
alter table public.lessons replica identity full;

-- Эцсийн байдал — энэ хоёр мөр буцаж ирэх ёстой.
select tablename as "realtime-д байгаа хүснэгт"
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by 1;
