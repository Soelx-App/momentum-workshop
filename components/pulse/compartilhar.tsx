"use client";

import { BotaoCopiar } from "@/components/pulse/botao-copiar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Compartilhar({ codigo, adminToken }: { codigo: string; adminToken: string }) {
  const origem = typeof window === "undefined" ? "" : window.location.origin;
  const linkParticipantes = `${origem}/s/${codigo}`;
  const linkAdmin = `${origem}/s/${codigo}/organizador#t=${encodeURIComponent(adminToken)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compartilhar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Código da sessão</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em]">{codigo}</p>
          <p className="break-all text-sm">{linkParticipantes}</p>
          <BotaoCopiar texto={linkParticipantes} rotulo="Copiar link dos participantes" />
        </div>
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-sm font-medium">Link de administração</p>
          <p className="text-xs text-muted-foreground">
            Use para abrir o painel em outro aparelho. Não compartilhe: quem tiver este link
            administra a sessão.
          </p>
          <BotaoCopiar texto={linkAdmin} rotulo="Copiar link de administração" />
        </div>
      </CardContent>
    </Card>
  );
}
