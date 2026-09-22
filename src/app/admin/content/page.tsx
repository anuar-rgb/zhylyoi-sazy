import { getStaffIdentity } from "@/lib/profile";
import { getContentOverrides } from "@/lib/orgContent";
import ContentForm from "./ContentForm";
import { updateContent } from "./actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function ContentPage() {
  const identity = await getStaffIdentity();

  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Тексты сайта</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Профиль сотрудника не настроен</p>
          <p className="text-sm text-ocean/60">
            Учётная запись существует, но не связана с профилем в системе. Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  const overrides = await getContentOverrides();

  return <ContentForm overrides={overrides} action={updateContent} />;
}
