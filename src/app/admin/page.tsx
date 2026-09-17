import { ensureProfile, requireRole } from "@/lib/roles";
import { getAllProfiles } from "@/lib/queries";
import AdminUserList from "@/components/AdminUserList";

export const metadata = {
  title: "Админ — Тактикийн тэмдгийн сургалт",
};

export default async function AdminPage() {
  await ensureProfile();
  const { userId } = await requireRole("admin");
  const profiles = await getAllProfiles();

  return <AdminUserList profiles={profiles} currentUserId={userId} />;
}
