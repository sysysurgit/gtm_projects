import type { Metadata } from "next";
import { Libre_Baskerville, Geist } from "next/font/google";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Hooks",
  description:
    "Génère des hooks publicitaires B2B pour LinkedIn, Meta, Google et Reddit Ads, calibrés sur ton brief réel et notés honnêtement de 0 à 100.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${libreBaskerville.variable} ${geist.variable} h-full antialiased`}
    >
      <head>
        {/* Applique le thème (dark par défaut / light si choisi) avant la
            première peinture pour éviter le flash. Le toggle vit dans l'app
            layout (visible une fois connecté) ; la landing suit le choix. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("hooks-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light")}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
