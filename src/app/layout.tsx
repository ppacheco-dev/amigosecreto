import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Amigo Secreto Familiar 🎄",
  description:
    "Juego familiar de Amigo Secreto con restricciones, lista de deseos opcional y enlaces privados por WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased selection:bg-rose-200 selection:text-rose-950">
        {children}
      </body>
    </html>
  );
}
