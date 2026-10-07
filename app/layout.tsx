import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ConvexClientProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — sua sala, seu encontro",
  description: "Crie uma sala e compartilhe o acesso com os participantes do seu encontro.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="Pulse — página inicial">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="currentColor" />
              <path d="M6 17h5l3-8 4 15 3-7h5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>pulse<span className="brand-dot">.</span></span>
          </Link>
          <span className="header-note">Um espaço para o seu encontro</span>
        </header>
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <footer className="site-footer">Pulse · Momentum workshop</footer>
      </body>
    </html>
  );
}
