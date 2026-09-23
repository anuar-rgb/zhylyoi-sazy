import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import VideoForm from "../VideoForm";
import { createVideo } from "../actions";

export default async function NewVideoPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-videos");

  // No organizationId prop: nothing is uploaded, so there is no Storage folder to
  // know about before the row exists. The institution is resolved in the action.
  return <VideoForm action={createVideo} heading="Новое видео" />;
}
