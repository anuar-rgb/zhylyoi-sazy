import { Montserrat } from "next/font/google";
import { staffAreaMetadata } from "@/lib/staffAreaMetadata";
import "../globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export function generateMetadata() {
  return staffAreaMetadata("Вход для сотрудников");
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream/30">{children}</body>
    </html>
  );
}
