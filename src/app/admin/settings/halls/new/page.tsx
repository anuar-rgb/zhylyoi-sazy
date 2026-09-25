import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import HallForm from "../HallForm";
import { createHall } from "../actions";

export default async function NewHallPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/settings/halls");

  return <HallForm action={createHall} heading="Новый зал" />;
}
