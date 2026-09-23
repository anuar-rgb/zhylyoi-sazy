import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import PieceForm from "../PieceForm";
import { createPiece } from "../actions";

export default async function NewPiecePage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-repertoire");

  // No organizationId prop here, unlike the other forms: a piece has no photo, so
  // nothing is uploaded before the row exists and the institution is resolved in
  // the server action alone.
  return <PieceForm action={createPiece} heading="Новое произведение" />;
}
