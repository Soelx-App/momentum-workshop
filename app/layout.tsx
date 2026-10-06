import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum workshop",
  description: "Base mínima para desenvolvimento com agentes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
