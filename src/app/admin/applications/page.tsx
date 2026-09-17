import { readAllApplications } from "@/lib/applications";
import DeleteButton from "../DeleteButton";

export default async function ApplicationsPage() {
  const applications = await readAllApplications();

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">
        Заявки в кружки <span className="text-ocean/40 font-normal">({applications.length})</span>
      </h1>

      {applications.length === 0 ? (
        <p className="text-ocean/60 bg-white rounded-3xl p-8 border border-cream-dark text-center">Заявок пока нет.</p>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-cream-dark shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-bold text-ocean text-lg">{app.childName}</h2>
                  <p className="text-sm text-ocean/50">
                    {new Date(app.createdAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-gold/15 text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full">
                    {app.clubTitle}
                  </span>
                  <DeleteButton id={app.id} childName={app.childName} />
                </div>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <dt className="text-ocean/50">Возраст</dt>
                  <dd className="text-ocean font-medium">{app.age}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-ocean/50">Телефон родителя</dt>
                  <dd>
                    <a href={`tel:${app.parentPhone}`} className="text-ocean font-medium hover:text-gold-dark">
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
                <p className="text-sm text-ocean/70 bg-cream/40 rounded-3xl p-3 border border-cream-dark">{app.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
