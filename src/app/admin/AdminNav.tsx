"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/events", label: "Мероприятия" },
  { href: "/admin/news", label: "Новости" },
  { href: "/admin/culture-clubs", label: "Кружки" },
  { href: "/admin/applications", label: "Заявки" },
  { href: "/admin/settings", label: "Настройки" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              active ? "bg-ocean text-cream" : "text-ocean/70 hover:bg-ocean/10 hover:text-ocean"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
