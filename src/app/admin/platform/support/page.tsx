import { notFound } from "next/navigation";
import { listSupportRequests, supportContext } from "@/lib/support";
import { CARD, RequestList } from "../../support/views";

export const metadata = { title: "Поддержка" };

/** Every institution's requests; those waiting for an answer first. */
export default async function PlatformSupportPage() {
  const ctx = await supportContext();
  if (!ctx || ctx.side !== "platform") notFound();
  const items = await listSupportRequests(ctx);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Поддержка</h1>
      <p className="text-sm text-ocean/60 mb-6">
        Обращения учреждений. Красная точка: учреждение написало, а вы ещё не открыли. Закрытое обращение можно удалить
        вместе с картинками, чтобы не занимало место.
      </p>
      {items ? (
        <RequestList items={items} base="/admin/platform/support" showInstitution />
      ) : (
        <p className={`${CARD} p-6 text-sm text-ocean/60`}>Не удалось загрузить обращения. Обновите страницу.</p>
      )}
    </div>
  );
}
