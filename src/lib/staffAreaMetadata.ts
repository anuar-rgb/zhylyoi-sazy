import type { Metadata } from "next";
import { getSiteOrganization } from "@/lib/organization";

/**
 * The staff pages' tab: their own title, never indexed, and the institution's logo as the icon
 * (the site's icons come from its card, there is no fixed icon file any more).
 */
export async function staffAreaMetadata(title: string): Promise<Metadata> {
  const organization = await getSiteOrganization();
  const logo = organization?.logoUrl;
  return {
    title,
    robots: { index: false, follow: false },
    ...(logo ? { icons: { icon: logo, apple: logo } } : {}),
  };
}
