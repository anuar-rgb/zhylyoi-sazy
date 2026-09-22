import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganization } from "@/lib/organization";
import SettingsForm from "./SettingsForm";
import { updateOrganization } from "./actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function SettingsPage() {
  const identity = await getStaffIdentity();

  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Настройки</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Профиль сотрудника не настроен</p>
          <p className="text-sm text-ocean/60">
            Учётная запись существует, но не связана с профилем в системе. Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  const organization = await getSiteOrganization();

  if (!organization) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Настройки</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Учреждение не найдено</p>
          <p className="text-sm text-ocean/60">
            Сайт не смог определить своё учреждение. Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  return <SettingsForm organization={organization} action={updateOrganization} />;
}
