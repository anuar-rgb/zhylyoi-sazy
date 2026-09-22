import { readAllApplications } from "@/lib/applications";
import { telHref } from "@/lib/contactLinks";
import DeleteButton from "../DeleteButton";
import MarkProcessedButton from "./MarkProcessedButton";

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

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">
        Заявки в кружки{" "}
        <span className="text-ocean/40 font-normal">
          ({applications.length}
          {pending > 0 && applications.length !== pending ? `, новых ${pending}` : ""})
        </span>
      </h1>

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
