"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Мероприятия, Новости, Кружки and Заявки are deliberately absent: the dashboard
 * carries a tile for each, and having both was the same word twice on one screen.
 *
 * Состав ансамбля, Репертуар and Видео are absent too, for a different reason:
 * they belong to a specific collective, and are edited from that collective's own
 * page (/admin/culture-collectives/[id]), the way the roster already is. Nothing
 * here would tell you which collective you were editing.
 */
const items = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/culture-collectives", label: "Коллективы" },
  { href: "/admin/culture-staff", label: "Сотрудники" },
  { href: "/admin/content", label: "Тексты сайта" },
  { href: "/admin/tickets", label: "Билеты" },
  { href: "/admin/settings", label: "Настройки" },
];

/** The platform owner's whole panel. They do not work on any institution's content. */
const INSTITUTIONS_HREF = "/admin/platform";
const STATS_HREF = "/admin/platform/stats";
const platformItems = [
  { href: INSTITUTIONS_HREF, label: "Учреждения" },
  { href: STATS_HREF, label: "Статистика" },
];

function isActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  // An institution's own page (/admin/platform/<id>, /new) belongs to «Учреждения».
  return href === INSTITUTIONS_HREF && pathname.startsWith(`${INSTITUTIONS_HREF}/`) && !pathname.startsWith(STATS_HREF);
}

export default function AdminNav({ newApplications = 0, isPlatformAdmin = false }: { newApplications?: number; isPlatformAdmin?: boolean }) {
  const pathname = usePathname();
  const shown = isPlatformAdmin ? platformItems : items;

  return (
    <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
      {shown.map((item) => {
        const active = isActive(item.href, pathname);
        // The count moved onto Дашборд with the Заявки item it used to sit on.
        // The point of it is to be seen while working on something else, and the
        // dashboard is now the only way through to the applications.
        const badge = item.href === "/admin" ? newApplications : 0;

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
