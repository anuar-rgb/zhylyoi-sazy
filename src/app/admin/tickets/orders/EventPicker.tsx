"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Which event's hall the map shows (and whose orders are listed). */
export default function EventPicker({
  events,
  value,
}: {
  events: { id: string; label: string; group: "current" | "other" }[];
  value: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("event", e.target.value);
        router.push(`/admin/tickets/orders?${next}`);
      }}
      aria-label="Мероприятие"
      className="w-full sm:w-auto max-w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-white text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
    >
      <optgroup label="Предстоящие">
        {events.filter((e) => e.group === "current").map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Прошедшие и черновики">
        {events.filter((e) => e.group === "other").map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
