import { redirect } from "next/navigation";
import { Montserrat } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";
import "../globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Панель управления",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Second line of defence: the middleware already redirects anonymous requests,
  // but the layout re-validates so no admin markup can render without a session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const identity = await getStaffIdentity();

  return (
    <html lang="ru" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream/30">
        <header className="bg-ocean-dark text-cream">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gold leading-tight">Панель управления</p>
              <p className="text-xs text-cream/60">«Кең Жылыой» мәдениет үйі</p>
            </div>
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0 text-right max-w-[45vw] sm:max-w-none">
                <p className="text-xs sm:text-sm text-cream/80 truncate">{identity?.displayName ?? user.email}</p>
                {identity?.roleLabel && <p className="text-[11px] text-cream/50 truncate">{identity.roleLabel}</p>}
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 grid lg:grid-cols-[200px_1fr] gap-6 lg:gap-8">
          {/* min-w-0: without it the grid item's default min-width:auto stretches to the
              nav's full content width, so the nav's horizontal scroll never engages on mobile. */}
          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            <AdminNav />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
