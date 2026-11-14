import Link from "next/link";
import type { SupportListItem, SupportThread } from "@/lib/support";
import { SUPPORT_STATUS_LABELS, SUPPORT_STATUS_STYLES } from "@/lib/supportRules";
import { formatDateTime } from "@/lib/timeZone";

/** «Поддержка» views shared by the institution's panel and the platform's. */

export const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

function StatusBadge({ item }: { item: SupportListItem }) {
  return (
    <span className={`shrink-0 inline-block rounded-full px-3 py-1 text-xs font-semibold ${SUPPORT_STATUS_STYLES[item.status]}`}>
      {SUPPORT_STATUS_LABELS[item.status]}
    </span>
  );
}

export function RequestList({ items, base, showInstitution }: { items: SupportListItem[]; base: string; showInstitution: boolean }) {
  if (!items.length) return <p className={`${CARD} p-6 text-sm text-ocean/60`}>Обращений пока нет.</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`${base}/${item.id}`} className={`${CARD} block p-4 sm:p-5 hover:shadow-md transition-shadow`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ocean break-words flex items-center gap-2">
                  {item.unread && <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" aria-label="Новое" />}
                  {item.subject}
                </p>
                {showInstitution && <p className="text-sm text-ocean/60 break-words mt-0.5">{item.organizationName}</p>}
              </div>
              <StatusBadge item={item} />
            </div>
            <p className="text-xs text-ocean/50 mt-2">Последнее сообщение: {formatDateTime(item.lastMessageAt)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Thread({ thread, ownSide }: { thread: SupportThread; ownSide: "platform" | "institution" }) {
  return (
    <ol className="space-y-3">
      {thread.messages.map((m) => {
        const mine = (ownSide === "platform") === m.fromPlatform;
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`w-full sm:max-w-[85%] rounded-3xl border p-4 ${
                mine ? "bg-ocean/5 border-ocean/15" : "bg-white border-cream-dark shadow-sm"
              }`}
            >
              <p className="text-xs text-ocean/55 mb-1.5">
                <span className="font-semibold text-ocean/80">{m.fromPlatform ? "Поддержка платформы" : m.authorName}</span> ·{" "}
                {formatDateTime(m.createdAt)}
              </p>
              <p className="text-sm text-ocean whitespace-pre-wrap break-words">{m.body}</p>
              {m.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {m.images.map((img) => (
                    <a key={img.path} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                      {/* Signed, short-lived links to a private bucket: next/image would cache them. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="Скриншот" className="h-28 w-auto max-w-full rounded-xl border border-cream-dark object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ThreadHeader({ thread, back, backLabel, showInstitution }: { thread: SupportThread; back: string; backLabel: string; showInstitution: boolean }) {
  return (
    <div>
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3">
        ← {backLabel}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean break-words min-w-0">{thread.subject}</h1>
        <StatusBadge item={thread} />
      </div>
      {showInstitution && <p className="text-sm text-ocean/60 mt-1 break-words">{thread.organizationName}</p>}
    </div>
  );
}
