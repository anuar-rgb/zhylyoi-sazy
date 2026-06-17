import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Жылыой сазы — фольклорлық ансамбль",
    template: "%s | Жылыой сазы",
  },
  description:
    "«Кең Жылыой» мәдениет үйі жанындағы «Жылыой сазы» фольклорлық ансамблінің ресми сайты. Қазақ халқының дәстүрлі музыкалық мұрасын насихаттау. Жылыой ауданы, Атырау облысы.",
  keywords: [
    "Жылыой сазы",
    "фольклорлық ансамбль",
    "Кең Жылыой",
    "мәдениет үйі",
    "қазақ халық музыкасы",
    "домбыра",
    "қобыз",
    "күй",
    "халық әні",
    "Жылыой ауданы",
    "Атырау облысы",
    "дәстүрлі музыка",
  ],
  authors: [{ name: "«Жылыой сазы» фольклорлық ансамблі" }],
  openGraph: {
    title: "Жылыой сазы — фольклорлық ансамбль",
    description:
      "«Кең Жылыой» мәдениет үйі жанындағы фольклорлық ансамбль. 18 кәсіби өнерпаз. Қазақ халқының музыкалық мұрасын сақтау мен насихаттау.",
    locale: "kk_KZ",
    type: "website",
    siteName: "Жылыой сазы",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="kk" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
