import Link from "next/link";
import { notFound } from "next/navigation";
import { getInstitution, platformAdmin } from "@/lib/platform";
import { getMailStatus } from "@/lib/mailSettings";
import { AdminsPanel, MailPanel, SitePanel } from "./InstitutionPanels";

export const metadata = { title: "Учреждение" };

/**
 * One institution as the platform owner sees it: its site (domain, on or off), its admins and its
 * mailbox. What the institution shows on its site is edited in its own panel, not here.
 */
export default async function InstitutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const ctx = await platformAdmin();
  if (!ctx) notFound();
  const { id } = await params;
  const { created } = await searchParams;
  const institution = await getInstitution(ctx.admin, id);
  if (!institution) notFound();
  const [mailStatus, { data: me }] = await Promise.all([getMailStatus(id), ctx.admin.auth.admin.getUserById(ctx.identity.userId)]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/platform" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3">
          ← Учреждения
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean break-words">{institution.name}</h1>
        {institution.domain && (
          <p className="text-sm text-ocean/60 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <a href={`https://${institution.domain}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-ocean break-all">
              Сайт: {institution.domain}
            </a>
            <a href={`https://${institution.domain}/admin`} target="_blank" rel="noopener noreferrer" className="underline hover:text-ocean">
              Панель учреждения
            </a>
          </p>
        )}
      </div>

      {created && (
        <p className="bg-gold/15 border border-gold/40 text-ocean-dark text-sm rounded-2xl px-4 py-3">
          Учреждение создано. Теперь добавьте его администратора: он получит ссылку и сам заполнит сайт.
        </p>
      )}

      <AdminsPanel id={institution.id} admins={institution.admins} domain={institution.domain} />
      <SitePanel id={institution.id} domain={institution.domain} isActive={institution.isActive} />
      <MailPanel id={institution.id} status={mailStatus} adminEmail={me?.user?.email ?? ""} />
    </div>
  );
}
