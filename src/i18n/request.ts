import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Page content is colocated per-page as { kk, ru } dictionaries rather than
    // global message catalogs, so no messages are loaded here.
    messages: {},
  };
});
