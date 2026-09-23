import { readAllApplications, type ApplicationRecord } from "@/lib/applications";
import { telHref } from "@/lib/contactLinks";
import DeleteButton from "../DeleteButton";
import MarkProcessedButton from "./MarkProcessedButton";
import MarkSeenOnView from "./MarkSeenOnView";
import BackToDashboard from "../BackToDashboard";

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
 * Applications per club, busiest first.
 *
 * Grouped by club_id where there is one, because that survives a rename: two
 * spellings of the same club would otherwise show up as two rows and split the
 * count. Applications made before the link was recorded, and the ensemble card,
 * have no id and fall back to grouping by the title they were stored with.
 *
 * Counted from the list the page already loaded rather than asked of the database
 * again — the numbers and the cards below then cannot disagree with each other.
 */
function summarizeByClub(applications: ApplicationRecord[]): ClubSummary[] {
  const groups = new Map<string, ClubSummary>();

  for (const app of applications) {
    const title = app.clubTitle || "Без кружка";
    const key = app.clubId ?? `title:${title}`;

    let row = groups.get(key);
    if (!row) {
      row = { key, title, total: 0, new: 0, inProgress: 0, completed: 0, rejected: 0 };
      groups.set(key, row);
    }

    // The most recent title wins, and the list arrives newest first: a club renamed
    // yesterday reads under its current name, not the one it had a year ago.
    row.total += 1;
    if (app.status === "new") row.new += 1;
    else if (app.status === "in_progress") row.inProgress += 1;
    else if (app.status === "completed") row.completed += 1;
    else if (app.status === "rejected") row.rejected += 1;
  }

  return [...groups.values()].sort((a, b) => b.total - a.total || a.title.localeCompare(b.title, "ru"));
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { dateStyle: "medium" });
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  completed: "Обработана",
  rejected: "Отклонена",
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-gold/15 text-ocean-dark",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-ocean/5 text-ocean/50",
  rejected: "bg-ocean/5 text-ocean/40",
};

export default async function ApplicationsPage() {
  const applications = await readAllApplications();
  const pending = applications.filter((app) => app.status === "new").length;
  const hasUnseen = applications.some((app) => !app.seenAt);
  const byClub = summarizeByClub(applications);
  // Newest first, so the ends of the list are the ends of the period.
  const newest = applications[0];
  const oldest = applications[applications.length - 1];

  return (
    <div>
      <MarkSeenOnView hasUnseen={hasUnseen} />
      <BackToDashboard />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">
        Заявки в кружки{" "}
        <span className="text-ocean/40 font-normal">
          ({applications.length}
          {pending > 0 && applications.length !== pending ? `, новых ${pending}` : ""})
        </span>
      </h1>

      {applications.length > 0 && (
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
                    <td className="py-2 pr-2 text-ocean font-medium">{row.title}</td>
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
        <div className="space-y-4">
          {applications.map((app) => {
            // A handled application stays in the list but steps back visually, so
            // the new ones are the ones that catch the eye.
            const handled = app.status !== "new";

            return (
              <div
                key={app.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 border border-cream-dark shadow-sm ${handled ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-bold text-ocean text-lg">{app.childName}</h2>
                    <p className="text-sm text-ocean/50">
                      {new Date(app.createdAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
                      {app.processedAt && (
                        <>
                          {" · обработана "}
                          {new Date(app.processedAt).toLocaleDateString("ru-RU", { dateStyle: "medium" })}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLE[app.status] ?? STATUS_STYLE.new}`}
                    >
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                    <MarkProcessedButton id={app.id} status={app.status} />
                    <DeleteButton id={app.id} childName={app.childName} />
                  </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <dt className="text-ocean/50">Кружок</dt>
                    <dd className="text-ocean font-medium">{app.clubTitle || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ocean/50">Возраст</dt>
                    <dd className="text-ocean font-medium">{app.age || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ocean/50">Телефон родителя</dt>
                    <dd>
                      <a href={telHref(app.parentPhone)} className="text-ocean font-medium hover:text-gold-dark">
                        {app.parentPhone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ocean/50">Согласие</dt>
                    <dd className="text-ocean font-medium">{app.consent ? "Да" : "Нет"}</dd>
                  </div>
                </dl>

                {app.comment && (
                  <p className="text-sm text-ocean/70 bg-cream/40 rounded-3xl p-3 border border-cream-dark">
                    {app.comment}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
