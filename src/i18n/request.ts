import { getRequestConfig } from "next-intl/server";

/**
 * Egyelőre egyetlen nyelv (magyar), URL-előtag nélkül. Az angol később egy
 * messages/en.json-nal és nyelvválasztással (cookie / profil) jön (DECISIONS.md: D-004).
 */
export const defaultLocale = "hu" as const;

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone: "Europe/Budapest",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
