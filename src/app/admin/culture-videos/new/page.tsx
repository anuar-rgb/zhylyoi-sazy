import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { listCultureClubs } from "@/lib/cultureClubs";
import VideoForm from "../VideoForm";
import { createVideo } from "../actions";

export default async function NewVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const { club } = await searchParams;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-videos");

  // Listed here, not inside the form: the form is a client component and cannot
  // reach the database itself.
  const collectives = (await listCultureClubs("creative_collective")).map((c) => ({
    id: c.id,
    name: c.nameRu ?? c.nameKk ?? "Коллектив",
  }));

  // Only a collective this person can actually see is honoured. The id comes from
  // the address bar, and preselecting one that is not in the list would show a
  // picker whose value is not among its options.
  const known = club && collectives.some((c) => c.id === club) ? club : undefined;

  // No organizationId prop: nothing is uploaded, so there is no Storage folder to
  // know about before the row exists. The institution is resolved in the action.
  return (
    <VideoForm
      collectives={collectives}
      defaultClubId={known}
      returnTo={known ? `/admin/culture-collectives/${known}` : undefined}
      action={createVideo}
      heading="Новое видео"
    />
  );
}
