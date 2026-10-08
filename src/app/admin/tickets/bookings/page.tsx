import { redirect } from "next/navigation";

/**
 * «Ожидают оплаты» was merged into «Заказы»: unpaid orders are confirmed there now. Kept as a
 * redirect so a saved link or bookmark still lands on the same list.
 */
export default function PendingBookingsPage() {
  redirect("/admin/tickets/orders?status=pending");
}
