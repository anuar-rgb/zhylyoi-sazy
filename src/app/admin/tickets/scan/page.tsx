import { getStaffIdentity } from "@/lib/profile";
import { listCheckInEvents } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import BackToTickets from "../BackToTickets";
import ScannerClient from "./ScannerClient";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function ScanPage() {
  const identity = await getStaffIdentity();

  if (!identity?.hasProfile) {
    return (
      <div>
        <BackToTickets />
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Сканер билетов</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Профиль сотрудника не настроен</p>
          <p className="text-sm text-ocean/60">
            Учётная запись существует, но не связана с профилем в системе. Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  const events = (await listCheckInEvents()).map((event) => ({
    id: event.id,
    title: event.titleRu ?? event.titleKk ?? "Мероприятие",
    when: formatEventDateTime(event.eventDate),
  }));

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Сканер билетов</h1>
      <p className="text-sm text-ocean/60 mb-6">
        Выберите мероприятие, наведите камеру на QR-код с экрана зрителя или введите код вручную. Результат показывается на весь экран и
        сам скрывается — следующий билет можно сканировать сразу.
      </p>
      <ScannerClient events={events} />
    </div>
  );
}
