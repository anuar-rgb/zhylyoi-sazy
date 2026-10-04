import BackToTickets from "./BackToTickets";

/** Shown instead of a ticket-sales page when the signed-in account has no staff profile. */
export default function NoProfile({ title, reason }: { title: string; reason: "no_profile" | "no_organization" }) {
  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">{title}</h1>
      <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8">
        <p className="font-semibold text-ocean mb-2">
          {reason === "no_profile" ? "Профиль сотрудника не настроен" : "Не удалось определить учреждение"}
        </p>
        <p className="text-sm text-ocean/60">
          Учётная запись существует, но не связана с профилем в системе. Обратитесь к администратору платформы.
        </p>
      </div>
    </div>
  );
}
