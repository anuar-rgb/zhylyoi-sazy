import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["kk", "ru"],
  defaultLocale: "kk",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
