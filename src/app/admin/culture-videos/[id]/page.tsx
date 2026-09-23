import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getCultureVideoById } from "@/lib/cultureVideos";
import VideoForm from "../VideoForm";
import { updateVideo } from "../actions";

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-videos");

  // RLS decides visibility, so a recording belonging to another institution simply
  // is not found rather than being refused — the two are indistinguishable here,
  // and that is the point.
  const video = await getCultureVideoById(id);
  if (!video) notFound();

  return (
    <VideoForm video={video} action={updateVideo} heading={video.titleRu ?? video.titleKk ?? "Видео"} />
  );
}
