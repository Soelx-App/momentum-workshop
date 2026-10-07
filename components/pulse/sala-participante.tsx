"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { instanteDeReferencia } from "@/convex/estados";
import { BotaoVoto } from "@/components/pulse/botao-voto";
import { CabecalhoSessao } from "@/components/pulse/cabecalho-sessao";
import { EntrarNaSala } from "@/components/pulse/entrar-na-sala";
import { AvisoEncerrada, Carregando, SessaoNaoEncontrada } from "@/components/pulse/estados-simples";
import { FormularioPergunta } from "@/components/pulse/formulario-pergunta";
import { ListaParticipantes } from "@/components/pulse/lista-participantes";
import { ListaPerguntas } from "@/components/pulse/lista-perguntas";
import { Respondidas } from "@/components/pulse/respondidas";
import { SeletorEstado } from "@/components/pulse/seletor-estado";
import { useTokenSalvo } from "@/lib/armazenamento";
import { useAgora } from "@/lib/use-agora";
import type { VisaoParticipante } from "@/lib/tipos";

export function SalaParticipante({ codigo }: { codigo: string }) {
  const token = useTokenSalvo("participante", codigo);
  const visao = useQuery(
    api.sessoes.visao,
    token === undefined ? "skip" : { codigo, token: token ?? undefined },
  );

  if (token === undefined || visao === undefined) return <Carregando />;
  if (visao === null) return <SessaoNaoEncontrada />;
  if (visao.acesso !== "participante" || token === null) {
    return <EntrarNaSala sessao={visao.sessao} />;
  }
  return <SalaMembro token={token} visao={visao} />;
}

function SalaMembro({ token, visao }: { token: string; visao: VisaoParticipante }) {
  const agora = useAgora();
  const encerrada = visao.sessao.status === "encerrada";
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <CabecalhoSessao sessao={visao.sessao} />
      {encerrada && <AvisoEncerrada />}
      <SeletorEstado token={token} eu={visao.eu} sessao={visao.sessao} agora={agora} />
      <FormularioPergunta token={token} desativado={encerrada} />
      <ListaPerguntas
        perguntas={visao.abertas}
        acao={(p) => <BotaoVoto token={token} pergunta={p} desativado={encerrada} />}
      />
      <ListaParticipantes
        participantes={visao.participantes}
        referencia={instanteDeReferencia(visao.sessao, agora)}
      />
      <Respondidas perguntas={visao.respondidas} />
    </main>
  );
}
