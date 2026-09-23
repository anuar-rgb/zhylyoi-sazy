"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/culture-events", label: "Мероприятия" },
  { href: "/admin/culture-news", label: "Новости" },
  { href: "/admin/culture-clubs", label: "Кружки" },
  { href: "/admin/culture-staff", label: "Сотрудники" },
  { href: "/admin/culture-members", label: "Состав ансамбля" },
  { href: "/admin/applications", label: "Заявки" },
  { href: "/admin/content", label: "Тексты сайта" },
  { href: "/admin/settings", label: "Настройки" },
];

export default function AdminNav({ newApplications = 0 }: { newApplications?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
      {items.map((item) => {
        const active = pathname === item.href;
        const badge = item.href === "/admin/applications" ? newApplications : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              active ? "bg-ocean text-cream" : "text-ocean/70 hover:bg-ocean/10 hover:text-ocean"
            }`}
          >
            {item.label}
            {badge > 0 && (
              /* The count is announced in words as well as shown, because a red
                 circle with a number in it means nothing to a screen reader. */
              <span
                className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold leading-none"
                aria-label={`новых заявок: ${badge}`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
