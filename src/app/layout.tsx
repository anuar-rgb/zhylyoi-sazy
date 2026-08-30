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
    default: "«Кең Жылыой» Жылыой аудандық мәдениет үйі",
    template: "%s | Кең Жылыой",
  },
  description:
    "«Кең Жылыой» Жылыой аудандық мәдениет үйінің ресми сайты. «Жылыой сазы» фольклорлық ансамблі және мәдени іс-шаралар. Құлсары қаласы, Жылыой ауданы, Атырау облысы.",
  keywords: [
    "Кең Жылыой",
    "мәдениет үйі",
    "Жылыой аудандық мәдениет үйі",
    "Жылыой сазы",
    "фольклорлық ансамбль",
    "қазақ халық музыкасы",
    "домбыра",
    "қобыз",
    "күй",
    "халық әні",
    "Құлсары",
    "Жылыой ауданы",
    "Атырау облысы",
    "дәстүрлі музыка",
  ],
  authors: [{ name: "«Кең Жылыой» Жылыой аудандық мәдениет үйі" }],
  openGraph: {
    title: "«Кең Жылыой» Жылыой аудандық мәдениет үйі",
    description:
      "Жылыой ауданының мәдениет үйі. «Жылыой сазы» фольклорлық ансамблі. Қазақ халқының музыкалық мұрасын сақтау мен насихаттау.",
    locale: "kk_KZ",
    type: "website",
    siteName: "Кең Жылыой",
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
