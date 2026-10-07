"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { instanteDeReferencia } from "@/convex/estados";
import { BotaoResponder } from "@/components/pulse/botao-responder";
import { CabecalhoSessao } from "@/components/pulse/cabecalho-sessao";
import { Compartilhar } from "@/components/pulse/compartilhar";
import { EncerrarSessao } from "@/components/pulse/encerrar-sessao";
import { AvisoEncerrada, Carregando, SessaoNaoEncontrada } from "@/components/pulse/estados-simples";
import { ListaParticipantes } from "@/components/pulse/lista-participantes";
import { ListaPerguntas } from "@/components/pulse/lista-perguntas";
import { Respondidas } from "@/components/pulse/respondidas";
import { ResumoEstados } from "@/components/pulse/resumo-estados";
import { Button } from "@/components/ui/button";
import { salvarToken, useTokenAdmin } from "@/lib/armazenamento";
import { useAgora } from "@/lib/use-agora";

export function PainelOrganizador({ codigo }: { codigo: string }) {
  const adminToken = useTokenAdmin(codigo);

  // Guarda o token do link de administração e tira o segredo da barra de endereço.
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("t");
    if (t === null) return;
    salvarToken("admin", codigo, t);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [codigo]);

  const visao = useQuery(
    api.sessoes.visao,
    adminToken === undefined ? "skip" : { codigo, adminToken: adminToken ?? undefined },
  );
  const agora = useAgora();

  if (adminToken === undefined || visao === undefined) return <Carregando />;
  if (visao === null) return <SessaoNaoEncontrada />;
  if (visao.acesso !== "organizador" || adminToken === null) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Você não tem acesso de organizador a esta sessão</h1>
        <Button asChild>
          <Link href={`/s/${codigo}`}>Entrar como participante</Link>
        </Button>
      </main>
    );
  }

  const encerrada = visao.sessao.status === "encerrada";
  const referencia = instanteDeReferencia(visao.sessao, agora);
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <CabecalhoSessao sessao={visao.sessao} />
      {encerrada ? <AvisoEncerrada /> : <EncerrarSessao adminToken={adminToken} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ListaPerguntas
            perguntas={visao.abertas}
            acao={(p) => (
              <BotaoResponder adminToken={adminToken} perguntaId={p.id} desativado={encerrada} />
            )}
          />
          <Respondidas perguntas={visao.respondidas} />
        </div>
        <div className="space-y-6">
          <ResumoEstados participantes={visao.participantes} referencia={referencia} />
          <ListaParticipantes participantes={visao.participantes} referencia={referencia} />
          <Compartilhar codigo={visao.sessao.codigo} adminToken={adminToken} />
        </div>
      </div>
    </main>
  );
}
