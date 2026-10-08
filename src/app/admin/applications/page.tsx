import Link from "next/link";
import { readAllApplications, APPLICATION_STATUSES, type ApplicationRecord, type ApplicationStatus } from "@/lib/applications";
import { telHref } from "@/lib/contactLinks";
// The server runs on UTC; every date here is shown in the institution's own time.
import { formatDate, formatDateNumeric, formatDateTime, formatTime } from "@/lib/timeZone";
import DeleteButton from "../DeleteButton";
import MarkProcessedButton from "./MarkProcessedButton";
import MarkSeenOnView from "./MarkSeenOnView";
import StatusSelect from "./StatusSelect";
import { ClearHistoryButton, HideButton } from "./HistoryButtons";
import BackToDashboard from "../BackToDashboard";

/** How many cards the feed under the summary shows at a time. */
const PAGE_SIZE = 5;

type ClubSummary = {
  key: string;
  title: string;
  total: number;
  new: number;
  inProgress: number;
  completed: number;
  rejected: number;
};

/**
 * Which club an application belongs to, as used in the summary and in the ?club= address.
 *
 * Grouped by club_id where there is one, because that survives a rename: two spellings of the
 * same club would otherwise show up as two rows and split the count. Applications made before
 * the link was recorded, and the ensemble card the home page once had, have no id and fall back to the title they were
 * stored with.
 */
function clubKey(app: ApplicationRecord): string {
  return app.clubId ?? `title:${app.clubTitle || "Без кружка"}`;
}

/**
 * Applications per club, busiest first.
 *
 * Counted from the list the page already loaded rather than asked of the database again — the
 * numbers and the cards below then cannot disagree with each other.
 */
function summarizeByClub(applications: ApplicationRecord[]): ClubSummary[] {
  const groups = new Map<string, ClubSummary>();

  for (const app of applications) {
    const key = clubKey(app);
    let row = groups.get(key);
    if (!row) {
      // The list arrives newest first, so the first title seen is the current one: a club
      // renamed yesterday reads under its new name, not the one it had a year ago.
      row = { key, title: app.clubTitle || "Без кружка", total: 0, new: 0, inProgress: 0, completed: 0, rejected: 0 };
      groups.set(key, row);
    }
    row.total += 1;
    if (app.status === "new") row.new += 1;
    else if (app.status === "in_progress") row.inProgress += 1;
    else if (app.status === "completed") row.completed += 1;
    else if (app.status === "rejected") row.rejected += 1;
  }

  return [...groups.values()].sort((a, b) => b.total - a.total || a.title.localeCompare(b.title, "ru"));
}

function formatDay(iso: string): string {
  return formatDate(iso);
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  completed: "Обработана",
  rejected: "Отклонена",
};

const TAB_LABELS: Record<ApplicationStatus, string> = {
  new: "Новые",
  in_progress: "В работе",
  completed: "Обработаны",
  rejected: "Отклонены",
};

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  new: "bg-gold/15 text-ocean-dark",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-ocean/5 text-ocean/50",
  rejected: "bg-ocean/5 text-ocean/40",
};

/** hidden: the overview's feed lists the applications hidden from history instead of the rest. */
type View = { club: string | null; status: ApplicationStatus | null; page: number; hidden?: boolean };

/** The address of a view of this page; defaults are left out so the plain address stays plain. */
function hrefFor(view: View): string {
  const query = new URLSearchParams();
  if (view.club) query.set("club", view.club);
  if (view.hidden && !view.club) query.set("hidden", "1");
  if (view.status) query.set("status", view.status);
  if (view.page > 1) query.set("page", String(view.page));
  const qs = query.toString();
  return qs ? `/admin/applications?${qs}` : "/admin/applications";
}

function StatusTabs({ list, view }: { list: ApplicationRecord[]; view: View }) {
  const tabs: { status: ApplicationStatus | null; label: string; count: number }[] = [
    { status: null, label: "Все", count: list.length },
    ...APPLICATION_STATUSES.map((status) => ({
      status,
      label: TAB_LABELS[status],
      count: list.filter((app) => app.status === status).length,
    })),
  ];

  return (
    <nav aria-label="Статус заявок" className="flex flex-wrap gap-2 mb-4">
      {tabs.map((tab) => {
        const active = view.status === tab.status;
        return (
          <Link
            key={tab.status ?? "all"}
            href={hrefFor({ ...view, status: tab.status, page: 1 })}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              active
                ? "bg-ocean text-white border-ocean"
                : "bg-white text-ocean border-cream-dark hover:border-ocean/40"
            }`}
          >
            {tab.label}
            <span
              className={`text-xs tabular-nums ${
                active ? "text-white/70" : tab.status === "new" && tab.count > 0 ? "font-bold text-red-600" : "text-ocean/40"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function ApplicationCard({ app }: { app: ApplicationRecord }) {
  // A handled application stays in the list but steps back visually, so the new ones are the
  // ones that catch the eye.
  const handled = app.status !== "new";

  return (
    <li className={`bg-white rounded-3xl px-4 py-3.5 sm:px-5 sm:py-4 border border-cream-dark shadow-sm ${handled ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex flex-wrap items-baseline gap-x-2">
          <h3 className="font-bold text-ocean break-words">{app.childName}</h3>
          {app.age && <span className="text-sm text-ocean/60">Возраст: {app.age}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[app.status]}`}>
            {STATUS_LABELS[app.status]}
          </span>
          <MarkProcessedButton id={app.id} status={app.status} />
          {/* Not a delete: the feed only hides it. Deleting is done from the club's own list. */}
          <HideButton id={app.id} hidden={app.hiddenFromHistoryAt !== null} />
        </div>
      </div>

      <p className="mt-1.5 text-sm text-ocean/60 flex flex-wrap gap-x-3 gap-y-1">
        <span className="text-ocean font-medium">{app.clubTitle || "Без кружка"}</span>
        <a href={telHref(app.parentPhone)} className="text-ocean font-medium hover:text-gold-dark">
          {app.parentPhone}
        </a>
        <span>
          {formatDateTime(app.createdAt)}
          {/* processed_at is stamped on any change away from "new", so it is worded by the status. */}
          {app.processedAt && app.status === "completed" && ` · обработана ${formatDay(app.processedAt)}`}
          {app.processedAt && app.status === "rejected" && ` · отклонена ${formatDay(app.processedAt)}`}
        </span>
        <span>Согласие: {app.consent ? "да" : "нет"}</span>
      </p>

      {app.comment && (
        <p className="mt-2 text-sm text-ocean/70 bg-cream/40 rounded-2xl px-3 py-2 border border-cream-dark break-words">
          {app.comment}
        </p>
      )}
    </li>
  );
}

/**
 * A club's applications as one compact table.
 *
 * On a phone the table scrolls sideways inside its box, with the child's name held at the left
 * edge, rather than squeezing seven columns into a third of their width each.
 */
function ApplicationsTable({ list }: { list: ApplicationRecord[] }) {
  const th = "px-2.5 py-2.5 text-left text-xs font-medium text-ocean/50 whitespace-nowrap";
  const td = "px-2.5 py-2.5 align-middle";
  // The edge of the pinned name column, visible once the rest of the row slides under it.
  const pinned = "sticky left-0 z-10 bg-white shadow-[6px_0_6px_-6px_rgba(22,35,46,0.18)] lg:shadow-none";

  return (
    <div className="bg-white rounded-3xl border border-cream-dark shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[50rem] lg:min-w-0">
          <thead>
            <tr>
              <th className={`${th} ${pinned} pl-4 sm:pl-5`}>Имя</th>
              <th className={th}>Возраст</th>
              <th className={th}>Телефон родителя</th>
              <th className={th}>Согласие</th>
              <th className={th}>Подана</th>
              <th className={th}>Статус</th>
              <th className={`${th} text-right pr-4 sm:pr-5`}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {list.map((app) => (
              <tr key={app.id} className="border-t border-cream-dark hover:bg-cream/30 transition-colors">
                <td className={`${td} ${pinned} pl-4 sm:pl-5 max-w-[14rem]`}>
                  <span className="font-semibold text-ocean break-words">{app.childName}</span>
                  {app.comment && (
                    <span className="block text-xs text-ocean/50 line-clamp-2 mt-0.5" title={app.comment}>
                      {app.comment}
                    </span>
                  )}
                </td>
                <td className={`${td} text-ocean tabular-nums`}>{app.age || "—"}</td>
                <td className={`${td} whitespace-nowrap`}>
                  <a href={telHref(app.parentPhone)} className="text-ocean font-medium hover:text-gold-dark tabular-nums">
                    {app.parentPhone}
                  </a>
                </td>
                <td className={td}>
                  {app.consent ? <span className="text-ocean">Да</span> : <span className="text-red-600 font-semibold">Нет</span>}
                </td>
                <td className={`${td} text-ocean/60 whitespace-nowrap tabular-nums leading-tight`}>
                  {formatDateNumeric(app.createdAt)}
                  <span className="block text-xs text-ocean/40">
                    {formatTime(app.createdAt)}
                  </span>
                </td>
                <td className={td}>
                  <StatusSelect id={app.id} status={app.status} childName={app.childName} />
                </td>
                <td className={`${td} pr-4 sm:pr-5`}>
                  <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                    <MarkProcessedButton id={app.id} status={app.status} />
                    <DeleteButton id={app.id} childName={app.childName} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pager({ view, pages }: { view: View; pages: number }) {
  if (pages <= 1) return null;
  const linkClass =
    "px-4 py-2 rounded-full text-sm font-semibold border border-cream-dark bg-white text-ocean hover:border-ocean/40 transition-colors";
  const offClass = "px-4 py-2 rounded-full text-sm font-semibold border border-cream-dark text-ocean/30";

  return (
    <nav aria-label="Страницы заявок" className="mt-4 flex items-center justify-between gap-3">
      {view.page > 1 ? (
        <Link href={hrefFor({ ...view, page: view.page - 1 })} className={linkClass}>
          ← Новее
        </Link>
      ) : (
        <span className={offClass}>← Новее</span>
      )}
      <span className="text-sm text-ocean/60 tabular-nums">
        {view.page} из {pages}
      </span>
      {view.page < pages ? (
        <Link href={hrefFor({ ...view, page: view.page + 1 })} className={linkClass}>
          Старше →
        </Link>
      ) : (
        <span className={offClass}>Старше →</span>
      )}
    </nav>
  );
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; status?: string; page?: string; hidden?: string }>;
}) {
  const query = await searchParams;
  const applications = await readAllApplications();
  const pendingAll = applications.filter((app) => app.status === "new").length;
  const hasUnseen = applications.some((app) => !app.seenAt);
  const byClub = summarizeByClub(applications);

  // A club that no longer has applications (the last one was deleted) falls back to the overview.
  const club = query.club ? (byClub.find((row) => row.key === query.club) ?? null) : null;
  const status = APPLICATION_STATUSES.includes(query.status as ApplicationStatus) ? (query.status as ApplicationStatus) : null;

  // The summary above and a club's own list count every application. Only the overview's feed
  // («История заявок») leaves out what staff hid from it — or, with ?hidden=1, shows just those.
  const showingHidden = !club && query.hidden === "1";
  const hiddenCount = applications.filter((app) => app.hiddenFromHistoryAt !== null).length;
  const scoped = club
    ? applications.filter((app) => clubKey(app) === club.key)
    : applications.filter((app) => (app.hiddenFromHistoryAt !== null) === showingHidden);
  const clearable = applications.filter(
    (app) => app.hiddenFromHistoryAt === null && (app.status === "completed" || app.status === "rejected")
  ).length;
  const shown = status ? scoped.filter((app) => app.status === status) : scoped;

  // The overview pages its feed; a club's own screen lists every application of that club.
  const pages = club ? 1 : Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const requested = Number.parseInt(query.page ?? "1", 10);
  // Past the end (say, the last card on the last page was just deleted) shows the last page.
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), pages) : 1;
  const visible = club ? shown : shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const view: View = { club: club?.key ?? null, status, page, hidden: showingHidden };

  // Newest first, so the ends of the list are the ends of the period.
  const newest = applications[0];
  const oldest = applications[applications.length - 1];

  return (
    <div>
      <MarkSeenOnView hasUnseen={hasUnseen} />

      {club ? (
        <>
          <Link
            href={hrefFor({ club: null, status: null, page: 1 })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/60 hover:text-ocean mb-3"
          >
            ← Все заявки
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-1 break-words">{club.title}</h1>
          <p className="text-sm text-ocean/50 mb-5">
            Заявок: {club.total}
            {club.new > 0 && <span className="text-red-600 font-semibold">, новых {club.new}</span>}
          </p>
        </>
      ) : (
        <>
          <BackToDashboard />
          <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">
            Заявки в кружки{" "}
            <span className="text-ocean/40 font-normal">
              ({applications.length}
              {pendingAll > 0 && applications.length !== pendingAll ? `, новых ${pendingAll}` : ""})
            </span>
          </h1>
        </>
      )}

      {!club && applications.length > 0 && (
        <section className="bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="font-semibold text-ocean">Сводка по кружкам</h2>
            {oldest && newest && (
              <p className="text-xs text-ocean/40">
                {formatDay(oldest.createdAt)} — {formatDay(newest.createdAt)}
              </p>
            )}
          </div>

          {/* Scrolls sideways rather than wrapping: five numbers per row stay readable
              on a phone only if they keep their columns. */}
          <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
            <table className="w-full text-sm border-collapse min-w-[30rem]">
              <thead>
                <tr className="text-ocean/50 text-xs">
                  <th className="text-left font-medium pb-2">Кружок</th>
                  <th className="text-right font-medium pb-2 px-2">Всего</th>
                  <th className="text-right font-medium pb-2 px-2">Новых</th>
                  <th className="text-right font-medium pb-2 px-2">В работе</th>
                  <th className="text-right font-medium pb-2 px-2">Обработано</th>
                  <th className="text-right font-medium pb-2 pl-2">Отклонено</th>
                </tr>
              </thead>
              <tbody>
                {byClub.map((row) => (
                  <tr key={row.key} className="border-t border-cream-dark">
                    <td className="py-2 pr-2">
                      <Link
                        href={hrefFor({ club: row.key, status: null, page: 1 })}
                        className="text-ocean font-medium underline decoration-ocean/25 underline-offset-4 hover:text-gold-dark hover:decoration-gold-dark"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="py-2 px-2 text-right text-ocean tabular-nums">{row.total}</td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {row.new > 0 ? (
                        <span className="font-bold text-red-600">{row.new}</span>
                      ) : (
                        <span className="text-ocean/30">0</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-ocean/60 tabular-nums">{row.inProgress || "—"}</td>
                    <td className="py-2 px-2 text-right text-ocean/60 tabular-nums">{row.completed || "—"}</td>
                    <td className="py-2 pl-2 text-right text-ocean/40 tabular-nums">{row.rejected || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {applications.length === 0 ? (
        <p className="text-ocean/60 bg-white rounded-3xl p-8 border border-cream-dark text-center">Заявок пока нет.</p>
      ) : (
        <section aria-label={club ? `Заявки: ${club.title}` : "История заявок"}>
          {!club && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-3">
              <h2 className="font-semibold text-ocean">{showingHidden ? "Скрытые из истории" : "История заявок"}</h2>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {showingHidden ? (
                  <Link href={hrefFor({ club: null, status: null, page: 1 })} className="text-sm font-semibold text-ocean/60 hover:text-ocean">
                    ← К истории
                  </Link>
                ) : (
                  <>
                    {hiddenCount > 0 && (
                      <Link
                        href={hrefFor({ club: null, status: null, page: 1, hidden: true })}
                        className="text-sm font-semibold text-ocean/60 hover:text-ocean"
                      >
                        Скрытые ({hiddenCount})
                      </Link>
                    )}
                    <ClearHistoryButton count={clearable} />
                  </>
                )}
              </div>
            </div>
          )}
          <StatusTabs list={scoped} view={view} />

          {visible.length === 0 ? (
            <p className="text-ocean/60 bg-white rounded-3xl p-6 border border-cream-dark text-center text-sm">
              {scoped.length === 0
                ? showingHidden
                  ? "Скрытых заявок нет."
                  : "История пуста. Все заявки по-прежнему есть в сводке и в списках кружков."
                : "Заявок с таким статусом нет."}
            </p>
          ) : club ? (
            <ApplicationsTable list={visible} />
          ) : (
            <ul className="space-y-3">
              {visible.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </ul>
          )}

          <Pager view={view} pages={pages} />
        </section>
      )}
    </div>
  );
}
