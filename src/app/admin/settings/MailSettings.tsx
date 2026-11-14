import Link from "next/link";
import type { MailStatus } from "@/lib/mailSettings";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/**
 * Whether the institution's letters go out, and from where. The mailbox itself is set up by the
 * platform owner (Платформа → the institution → «Почта для писем»), never here: the institution's
 * staff do not see or change its password. The platform admin gets a link to it.
 */
export function MailSettingsStatus({ status, platformHref }: { status: MailStatus; platformHref?: string }) {
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-1">Почта для писем</p>
      <p className="text-sm text-ocean/70">
        {status.configured
          ? `Настроена. Билеты и уведомления покупателям уходят с адреса ${status.fromAddress ?? status.user}.`
          : "Не настроена: билеты и уведомления покупателям на почту не уходят. Обратитесь в поддержку платформы."}
      </p>
      {platformHref && (
        <Link href={platformHref} className="inline-block mt-3 text-sm font-semibold text-ocean underline hover:text-gold-dark">
          Настроить в «Платформе»
        </Link>
      )}
    </div>
  );
}
