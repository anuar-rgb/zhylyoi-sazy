// No server imports: the admin settings form (a client component) reads these too.

/**
 * Optional pages and blocks that came from the ensemble this site started with. A new institution
 * has none of them; each switches on what it has (Настройки → «Разделы сайта»).
 */
export const SITE_SECTIONS = ["honored", "zhastar", "about", "plan", "gallery"] as const;
export type SiteSection = (typeof SITE_SECTIONS)[number];

export const SITE_SECTION_LABELS: Record<SiteSection, { label: string; hint: string }> = {
  honored: { label: "Коллективы со званием «Народный»", hint: "Страница и пункт меню." },
  zhastar: { label: "Театр «Жастар»", hint: "Страница театра (текст и фото — Кең Жылыой)." },
  about: { label: "Об ансамбле", hint: "Страница коллектива, тексты в «Тексты сайта»." },
  plan: { label: "План развития", hint: "Страница плана, тексты в «Тексты сайта»." },
  gallery: { label: "Блок «Видео и фотогалерея» на главной", hint: "Фото в блоке — Кең Жылыой." },
};
