-- Эрхийг session token-ы claim-ээс биш, `profiles` хүснэгтээс уншина.
--
-- Учир нь: Clerk-ийн session token-д `publicMetadata` анхдагчаар ОРДОГГҮЙ.
-- Түүнийг оруулахын тулд Clerk dashboard дээр гараар claim нэмэх шаардлагатай
-- бөгөөд тэр тохиргоо хийгдээгүй үед `clerk_role()` бүх хэрэглэгчийг "student"
-- гэж үзэж, багш сурагчдынхаа жагсаалтыг харж чаддаггүй байв.
--
-- `profiles.role`-ыг зөвхөн service role бичдэг (RLS-д бичих бодлого алга) тул
-- энэ нь claim-ээс дутуугүй найдвартай. Нэмэлт давуу тал: эрх солигдмогц шууд
-- үйлчилнэ — session token сэргээгдэхийг (~60 сек) хүлээхгүй.
--
-- security definer тул дотоод select нь RLS-д шүүгдэхгүй — profiles дээрх
-- бодлого өөрөө энэ функцийг дууддаг учир рекурс үүсэхээс сэргийлнэ.
create or replace function public.clerk_role() returns text
  language sql stable security definer set search_path = public
  as $$
    select coalesce(
      (select role from public.profiles where id = auth.jwt()->>'sub'),
      'student'
    )
  $$;
