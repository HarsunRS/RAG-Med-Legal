import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Medical & Legal Q&A",
  description: "Domain-specific question answering over medical and legal documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#080a0f] text-white antialiased">{children}</body>
    </html>
  );
}
