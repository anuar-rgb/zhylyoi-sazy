import { redirect } from "next/navigation";

/** A hall has one page now, «Изменить»: seats, categories, prices and the grid all live there. */
export default async function HallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/tickets/halls/${id}/edit`);
}
