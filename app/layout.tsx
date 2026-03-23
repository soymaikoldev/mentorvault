import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MentorVault - Rewards Educativos en Solana",
  description:
    "Protocolo donde sponsors depositan SOL como recompensas educativas, controladas por mentores.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <Providers>
        <body
          suppressHydrationWarning
          className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
        >
          {children}
        </body>
      </Providers>
    </html>
  );
}
