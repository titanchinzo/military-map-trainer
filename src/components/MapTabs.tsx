"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** «Миний ажил» ↔ «Багшийн дэлгэц» таб. Хичээл явж байвал улаан цэгээр заана. */
export default function MapTabs({
  hasTeacher,
  teacherName,
  isLive,
}: {
  hasTeacher: boolean;
  teacherName: string | null;
  isLive: boolean;
}) {
  const pathname = usePathname();
  if (!hasTeacher) return null;

  const tabs = [
    { href: "/map", label: "Миний ажил" },
    {
      href: "/map/lesson",
      label: teacherName ? `Багшийн дэлгэц — ${teacherName}` : "Багшийн дэлгэц",
    },
  ];

  return (
    <nav className="flex shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-3">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition ${
              active
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            {tab.href === "/map/lesson" && isLive && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                ШУУД
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
