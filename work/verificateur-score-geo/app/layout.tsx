import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vérificateur de Score GEO",
  description:
    "Analysez la visibilité d'une page dans les réponses des moteurs IA (ChatGPT, Perplexity, Claude).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
