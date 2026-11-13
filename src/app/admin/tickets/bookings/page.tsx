import { redirect } from "next/navigation";

/**
 * «Ожидают оплаты» became part of «Заказы», which is now part of each event's page. Kept as a
 * redirect so a saved link or bookmark still lands on the Билеты page.
 */
export default function PendingBookingsPage() {
  redirect("/admin/tickets");
}
