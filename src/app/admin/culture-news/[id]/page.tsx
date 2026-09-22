import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureNewsById } from "@/lib/cultureNews";
import NewsForm from "../NewsForm";
import { updateNews } from "../actions";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-news");

  // RLS decides visibility, so an item belonging to another institution simply
  // is not found rather than being refused — the two are indistinguishable here,
  // and that is the point.
  const item = await getCultureNewsById(id);
  if (!item) notFound();

  const organizationId = identity.organizationId ?? item.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-news");

  return (
    <NewsForm
      item={item}
      organizationId={organizationId}
      action={updateNews}
      heading={item.titleRu ?? item.titleKk ?? "Новость"}
    />
  );
}
