import { notFound } from "next/navigation";
import { listSupportRequests, supportContext } from "@/lib/support";
import { NewRequestForm } from "./ui";
import { CARD, RequestList } from "./views";

export const metadata = { title: "Поддержка" };

/** The institution's requests to the platform owner, and a form for a new one. */
export default async function SupportPage() {
  const ctx = await supportContext();
  if (!ctx || ctx.side !== "institution") notFound();
  const items = await listSupportRequests(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Поддержка</h1>
        <p className="text-sm text-ocean/60">
          Что-то не работает или непонятно? Напишите, ответ придёт сюда, а на почту придёт уведомление.
        </p>
      </div>

      <section className={`${CARD} p-5 sm:p-6`}>
        <h2 className="text-lg font-bold text-ocean mb-4">Новое обращение</h2>
        <NewRequestForm />
      </section>

      <section>
        <h2 className="text-lg font-bold text-ocean mb-3">Ваши обращения</h2>
        {items ? (
          <RequestList items={items} base="/admin/support" showInstitution={false} />
        ) : (
          <p className={`${CARD} p-6 text-sm text-ocean/60`}>Не удалось загрузить обращения. Обновите страницу.</p>
        )}
      </section>
    </div>
  );
}
