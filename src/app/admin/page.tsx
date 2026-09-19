import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { readAllApplications } from "@/lib/applications";

export default async function DashboardPage() {
  const identity = await getStaffIdentity();
  const applications = await readAllApplications();

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-1">Дашборд</h1>
      <p className="text-sm text-ocean/60 mb-6">
        Вы вошли как {identity?.displayName}
        {identity?.roleLabel && <> · {identity.roleLabel}</>}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/admin/applications"
          className="block bg-white rounded-3xl p-5 sm:p-6 border border-cream-dark shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-3xl font-bold text-ocean">{applications.length}</p>
          <p className="text-sm text-ocean/60 mt-1">Заявок в кружки</p>
        </Link>

        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-cream-dark shadow-sm">
          <p className="text-sm font-semibold text-ocean mb-1">«Кең Жылыой» мәдениет үйі</p>
          <p className="text-sm text-ocean/60">
            Управление новостями, мероприятиями и кружками появится на следующих этапах.
          </p>
        </div>
      </div>
    </div>
  );
}
