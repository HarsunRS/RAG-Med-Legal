import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-display",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display-dm",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAG Medical & Legal Q&A",
  description: "Grounded, cited answers from your medical and legal documents.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${cormorant.variable} ${dmSerif.variable} ${inter.variable}`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
