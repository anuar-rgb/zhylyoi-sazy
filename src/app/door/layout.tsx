import { Montserrat } from "next/font/google";
import FeedbackProvider from "@/components/feedback/FeedbackProvider";
import LogoutButton from "../admin/LogoutButton";
import { getSiteOrganization, siteBrand } from "@/lib/organization";
import { staffAreaMetadata } from "@/lib/staffAreaMetadata";
import "../globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export function generateMetadata() {
  return staffAreaMetadata("Вход в зал");
}

/** The door's own frame: no staff menu, only who is signed in and the way out. */
export default async function DoorLayout({ children }: { children: React.ReactNode }) {
  const organization = await getSiteOrganization();
  return (
    <html lang="ru" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream/30">
        <FeedbackProvider>
          <header className="bg-ocean-dark text-cream">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-gold leading-tight">Вход в зал</p>
                <p className="text-xs text-cream/60 truncate">{organization ? siteBrand(organization, "ru").fullName : ""}</p>
              </div>
              <LogoutButton />
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">{children}</main>
        </FeedbackProvider>
      </body>
    </html>
  );
}
