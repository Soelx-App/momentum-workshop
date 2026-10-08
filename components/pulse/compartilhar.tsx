"use client";

import { BotaoCopiar } from "@/components/pulse/botao-copiar";

export function Compartilhar({ codigo, adminToken }: { codigo: string; adminToken: string }) {
  const origem = typeof window === "undefined" ? "" : window.location.origin;
  const linkParticipantes = `${origem}/s/${codigo}`;
  const linkAdmin = `${origem}/s/${codigo}/organizador#t=${encodeURIComponent(adminToken)}`;

  return (
    <section aria-labelledby="convite-titulo" className="rounded-xl border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 id="convite-titulo" className="text-sm font-medium text-muted-foreground">Convide as pessoas para a sessão</h2>
          <p className="font-mono text-3xl font-semibold tracking-[0.2em] sm:text-4xl" aria-label={`Código da sessão: ${codigo}`}>{codigo}</p>
          <p className="text-sm text-muted-foreground">Compartilhe este código ou envie o link.</p>
        </div>
        <BotaoCopiar texto={linkParticipantes} rotulo="Copiar link dos participantes" />
      </div>
      <details className="mt-5 border-t pt-2">
        <summary className="cursor-pointer rounded-sm text-sm text-muted-foreground">Acesso do organizador</summary>
        <div className="space-y-3 pb-1 pt-2">
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">O link de administração permite abrir este painel em outro aparelho. Guarde só para você: quem tiver o link poderá administrar a sessão.</p>
          <BotaoCopiar texto={linkAdmin} rotulo="Copiar link de administração" />
        </div>
      </details>
    </section>
  );
}
