"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ROLES, ROLE_LABEL, type Profile, type Role } from "@/types/db";

const ROLE_STYLE: Record<Role, string> = {
  admin: "bg-purple-950 text-purple-300",
  teacher: "bg-blue-950 text-blue-300",
  student: "bg-zinc-800 text-zinc-300",
};

/** Админ хэн нь багш, хэн нь сурагч болохыг эндээс шийднэ. */
export default function AdminUserList({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = profiles.filter(
    (p) =>
      !q ||
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q),
  );

  function changeRole(userId: string, role: Role) {
    setError(null);
    setBusyId(userId);
    void (async () => {
      try {
        const res = await fetch("/api/admin/role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setError(data?.error ?? "Эрх солиход алдаа гарлаа.");
          return;
        }
        startTransition(() => router.refresh());
      } catch {
        setError("Сүлжээний алдаа.");
      } finally {
        setBusyId(null);
      }
    })();
  }

  const counts = ROLES.map((role) => ({
    role,
    n: profiles.filter((p) => p.role === role).length,
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">Хэрэглэгчийн эрх</h1>
            <p className="text-sm text-zinc-500">
              {counts.map((c) => `${ROLE_LABEL[c.role]}: ${c.n}`).join(" · ")}
            </p>
          </div>
          <Link
            href="/map"
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Газрын зураг руу
          </Link>
        </header>

        {error && (
          <p className="rounded-md bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Нэр, и-мэйлээр хайх…"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
        />

        <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900">
          {shown.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {p.full_name ?? p.id}
                  {p.id === currentUserId && (
                    <span className="ml-2 text-[11px] text-zinc-500">(та)</span>
                  )}
                </p>
                <p className="truncate text-[11px] text-zinc-500">{p.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${ROLE_STYLE[p.role]}`}
                >
                  {ROLE_LABEL[p.role]}
                </span>
                <select
                  value={p.role}
                  disabled={pending || busyId === p.id || p.id === currentUserId}
                  onChange={(e) => changeRole(p.id, e.target.value as Role)}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none disabled:opacity-40"
                  title={
                    p.id === currentUserId
                      ? "Өөрийнхөө эрхийг эндээс өөрчлөх боломжгүй"
                      : undefined
                  }
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-zinc-600">
              Илэрц олдсонгүй.
            </li>
          )}
        </ul>

        <p className="text-xs text-zinc-600">
          Эрх нь Clerk-ийн <code>publicMetadata.role</code>-д хадгалагдана.
          Хэрэглэгч эрх нь солигдсоны дараа дахин нэвтэрвэл шинэ эрх нь бүрэн
          идэвхжинэ.
        </p>
      </div>
    </div>
  );
}
