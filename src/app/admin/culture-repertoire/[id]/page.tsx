import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getCultureRepertoireById } from "@/lib/cultureRepertoire";
import { listCultureClubs } from "@/lib/cultureClubs";
import PieceForm from "../PieceForm";
import { updatePiece } from "../actions";

export default async function EditPiecePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-repertoire");

  // RLS decides visibility, so a piece belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here, and
  // that is the point.
  const piece = await getCultureRepertoireById(id);
  if (!piece) notFound();

  const collectives = (await listCultureClubs("creative_collective")).map((c) => ({
    id: c.id,
    name: c.nameRu ?? c.nameKk ?? "Коллектив",
  }));

  // Opened from a collective page: saving and cancelling both go back there
  // rather than to the general list. Checked against the collectives this person
  // can see, so the address bar cannot send them somewhere else.
  const known = from && collectives.some((c) => c.id === from) ? from : undefined;

  return (
    <PieceForm
      piece={piece}
      collectives={collectives}
      returnTo={known ? `/admin/culture-collectives/${known}` : undefined}
      action={updatePiece}
      heading={piece.titleRu ?? piece.titleKk ?? "Произведение"}
    />
  );
}
