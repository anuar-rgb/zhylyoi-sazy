import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getCultureRepertoireById } from "@/lib/cultureRepertoire";
import PieceForm from "../PieceForm";
import { updatePiece } from "../actions";

export default async function EditPiecePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-repertoire");

  // RLS decides visibility, so a piece belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here, and
  // that is the point.
  const piece = await getCultureRepertoireById(id);
  if (!piece) notFound();

  return (
    <PieceForm
      piece={piece}
      action={updatePiece}
      heading={piece.titleRu ?? piece.titleKk ?? "Произведение"}
    />
  );
}
