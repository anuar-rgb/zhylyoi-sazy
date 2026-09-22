import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { getDashboardStats, type Metric, type OrganizationCard } from "@/lib/dashboard";

const CARD = "bg-white rounded-3xl p-5 sm:p-6 border border-cream-dark shadow-sm";

function StatCard({
  title,
  primary,
  label,
  secondary,
  href,
}: {
  title: string;
  primary: Metric;
  label: string;
  secondary?: { metric: Metric; label: string };
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm font-semibold text-ocean mb-2">{title}</p>
      {primary.value === null ? (
        <>
          <p className="text-3xl font-bold text-ocean/25">—</p>
          <p className="text-xs text-ocean/40 mt-1">Не удалось загрузить</p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold text-ocean">{primary.value}</p>
          <p className="text-sm text-ocean/60 mt-1">{primary.value === 0 ? "Пока нет" : label}</p>
          {secondary && secondary.metric.value !== null && (
            <p className="text-xs text-ocean/50 mt-2">
              {secondary.label}: {secondary.metric.value}
            </p>
          )}
        </>
      )}
    </>
  );

  return href ? (
    <Link href={href} className={`block ${CARD} hover:shadow-md transition-shadow`}>
      {body}
    </Link>
  ) : (
    <div className={CARD}>{body}</div>
  );
}

function OrganizationTile({ organization }: { organization: OrganizationCard }) {
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-2">Учреждение</p>

      {organization.kind === "error" && (
        <>
          <p className="text-3xl font-bold text-ocean/25">—</p>
          <p className="text-xs text-ocean/40 mt-1">Не удалось загрузить</p>
        </>
      )}

      {organization.kind === "none" && <p className="text-sm text-ocean/60">Пока нет</p>}

      {organization.kind === "many" && (
        <>
          <p className="text-3xl font-bold text-ocean">{organization.total}</p>
          <p className="text-sm text-ocean/60 mt-1">учреждений на платформе</p>
        </>
      )}

      {organization.kind === "one" && (
        <>
          <p className="text-base font-bold text-ocean leading-snug">{organization.name}</p>
          <p className="text-sm text-ocean/60 mt-1">{organization.regionName ?? "Регион не указан"}</p>
          <p className={`text-xs mt-2 ${organization.isActive ? "text-ocean/50" : "text-red-600"}`}>
            {organization.isActive ? "Видно на сайте" : "Скрыто с сайта"}
          </p>
        </>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const identity = await getStaffIdentity();

  // Without a profile row RLS returns nothing, so a grid of zeros would read as real
  // data. Say what is actually wrong instead.
  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Дашборд</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Профиль сотрудника не настроен</p>
          <p className="text-sm text-ocean/60">
            Учётная запись существует, но не связана с профилем в системе, поэтому данные недоступны.
            Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  const stats = await getDashboardStats(identity.organizationId);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-1">Дашборд</h1>
      <p className="text-sm text-ocean/60">
        Вы вошли как {identity.displayName}
        {identity.roleLabel && <> · {identity.roleLabel}</>}
      </p>
      {identity.organizationId === null && (
        <p className="text-xs text-ocean/45 mt-1">Данные по всей платформе</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <StatCard
          title="Заявки"
          primary={stats.applicationsTotal}
          label="в кружки"
          secondary={{ metric: stats.applicationsNew, label: "Новых" }}
          href="/admin/applications"
        />
        <StatCard
          title="Мероприятия"
          primary={stats.eventsPublished}
          label="опубликовано"
          secondary={{ metric: stats.eventsDraft, label: "Черновиков" }}
          href="/admin/events"
        />
        <StatCard
          title="Новости"
          primary={stats.newsPublished}
          label="опубликовано"
          secondary={{ metric: stats.newsDraft, label: "Черновиков" }}
          href="/admin/news"
        />
        <StatCard title="Кружки" primary={stats.clubsActive} label="активных" href="/admin/culture-clubs" />
        <OrganizationTile organization={stats.organization} />
      </div>
    </div>
  );
}
