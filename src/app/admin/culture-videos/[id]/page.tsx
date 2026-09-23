import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getCultureVideoById } from "@/lib/cultureVideos";
import { listCultureClubs } from "@/lib/cultureClubs";
import VideoForm from "../VideoForm";
import { updateVideo } from "../actions";

export default async function EditVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-videos");

  // RLS decides visibility, so a recording belonging to another institution simply
  // is not found rather than being refused — the two are indistinguishable here,
  // and that is the point.
  const video = await getCultureVideoById(id);
  if (!video) notFound();

  const collectives = (await listCultureClubs("creative_collective")).map((c) => ({
    id: c.id,
    name: c.nameRu ?? c.nameKk ?? "Коллектив",
  }));

  // Opened from a collective page: saving and cancelling both go back there
  // rather than to the general list. Checked against the collectives this person
  // can see, so the address bar cannot send them somewhere else.
  const known = from && collectives.some((c) => c.id === from) ? from : undefined;

  return (
    <VideoForm
      video={video}
      collectives={collectives}
      returnTo={known ? `/admin/culture-collectives/${known}` : undefined}
      action={updateVideo}
      heading={video.titleRu ?? video.titleKk ?? "Видео"}
    />
  );
}
