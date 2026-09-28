import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import NewHallForm from "./NewHallForm";

export default async function NewHallPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/halls");

  return <NewHallForm />;
}
