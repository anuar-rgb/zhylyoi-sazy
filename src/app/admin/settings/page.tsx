import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganization } from "@/lib/organization";
import SettingsForm from "./SettingsForm";
import { updateOrganization } from "./actions";
import TelegramSettings from "./TelegramSettings";
import { createClient } from "@/lib/supabase/server";
import { botUsername, linkCode, telegramConfigured } from "@/lib/telegram";

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

  // Order notifications: the institution's link to the bot, and whether a cashier is connected.
  const orgId = identity.organizationId ?? organization.id;
  const configured = telegramConfigured();
  const supabase = await createClient();
  const [{ data: telegram }, username] = await Promise.all([
    supabase.from("org_telegram").select("chat_id, is_enabled").eq("organization_id", orgId).maybeSingle(),
    configured ? botUsername() : Promise.resolve(null),
  ]);
  const code = linkCode(orgId);
  const link = username && code ? `https://t.me/${username}?start=${code}` : null;

  return (
    <div>
      <SettingsForm organization={organization} action={updateOrganization} />
      <section className="mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">Уведомления в Telegram</h2>
        <p className="text-sm text-ocean/60 mb-4">
          Кассир получает в Telegram сообщение о каждом новом заказе и о каждом шаге по нему — со ссылкой на «Заказы».
        </p>
        <div className={`${CARD} p-5 sm:p-6`}>
          <TelegramSettings link={link} linked={!!telegram?.chat_id && telegram.is_enabled !== false} configured={configured} canManage />
        </div>
      </section>
    </div>
  );
}
