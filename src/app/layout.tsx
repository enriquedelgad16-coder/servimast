import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SERVIMAST — Sistema de Nómina",
  description: "Sistema de Gestión de Nómina Quincenal - SERVIMAST Sistema de Seguridad y Redes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-gray-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
