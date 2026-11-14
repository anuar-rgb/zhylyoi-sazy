import type { Locale } from "@/i18n/routing";

const TEXT: Record<Locale, { title: string; body: string }> = {
  kk: { title: "Сайт табылмады", body: "Бұл мекенжай бойынша сайт жоқ немесе уақытша өшірілген." },
  ru: { title: "Сайт не найден", body: "По этому адресу сайта нет или он временно отключён." },
};

/**
 * What a domain shows when no active institution has it: a site switched off, or an address pointed
 * at the server by mistake. Nothing of any institution's is shown.
 */
export default function SiteNotFound({ locale }: { locale: Locale }) {
  const t = TEXT[locale];
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16 bg-cream">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-ocean mb-3">{t.title}</h1>
        <p className="text-ocean/70">{t.body}</p>
      </div>
    </main>
  );
}
