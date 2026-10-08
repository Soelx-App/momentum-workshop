import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "./providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { CabecalhoApp } from "@/components/pulse/cabecalho-app";

const geist = Geist({subsets:['latin'],variable:'--font-geist-sans'});

export const metadata: Metadata = {
  title: "Pulse",
  description: "Perguntas, votos e estados da sala em tempo real.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body>
        <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
        <CabecalhoApp />
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
