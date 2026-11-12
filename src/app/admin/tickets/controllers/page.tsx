import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listControllers } from "@/lib/controllers";
import BackToTickets from "../BackToTickets";
import ControllersClient from "./ControllersClient";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

/** «Контролёры»: who may check tickets at the door, added and switched off by the administrator. */
export default async function ControllersPage() {
  const identity = await getStaffIdentity();
  const organizationId = identity?.hasProfile ? (identity.organizationId ?? (await getSiteOrganizationId())) : null;

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Контролёры</h1>
      <p className="text-sm text-ocean/60 mb-6">
        Сотрудники на входе в зал. Они только проверяют билеты и видят схему зала: кто уже прошёл. Заказы, деньги и почту покупателей они не
        видят, менять на сайте ничего не могут. После входа контролёр сразу попадает на страницу проверки билетов.
      </p>
      {organizationId ? (
        <ControllersClient controllers={await listControllers(organizationId)} />
      ) : (
        <div className={`${CARD} p-8 text-sm text-ocean/60`}>Профиль сотрудника не настроен.</div>
      )}
    </div>
  );
}
