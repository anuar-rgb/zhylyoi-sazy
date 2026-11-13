import { redirect } from "next/navigation";

/**
 * «Заказы» was merged into each event's page (/admin/tickets/stats/[id]): its orders, refunds and
 * hall map with closed seats are there now, and an order is found by its number on the Билеты page.
 * Kept as a redirect so a saved link or bookmark still lands somewhere useful.
 */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  if (event && /^[0-9a-f-]{36}$/i.test(event)) redirect(`/admin/tickets/stats/${event}#orders`);
  redirect("/admin/tickets");
}
