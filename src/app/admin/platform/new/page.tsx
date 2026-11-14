import Link from "next/link";
import { notFound } from "next/navigation";
import { platformAdmin } from "@/lib/platform";
import NewInstitutionForm from "./NewInstitutionForm";

export const metadata = { title: "Новое учреждение" };

/** A new institution on the platform: its name and domain. Its admin is added on the next page. */
export default async function NewInstitutionPage() {
  if (!(await platformAdmin())) notFound();
  return (
    <div>
      <Link href="/admin/platform" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3">
        ← Платформа
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-5">Новое учреждение</h1>
      <NewInstitutionForm />
    </div>
  );
}
