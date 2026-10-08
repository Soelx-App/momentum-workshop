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
import { PaginaFormulario } from "@/components/pulse/pagina-formulario";
import { Button } from "@/components/ui/button";
import { rejeitarFragmento, salvarToken, tokenDoFragmento, useTokenAdmin } from "@/lib/armazenamento";
import { useAgora } from "@/lib/use-agora";

export function PainelOrganizador({ codigo }: { codigo: string }) {
  const adminToken = useTokenAdmin(codigo);
  const visao = useQuery(
    api.sessoes.visao,
    adminToken === undefined ? "skip" : { codigo, adminToken: adminToken ?? undefined },
  );

  // O token do link só é salvo depois que o servidor confirma o acesso de organizador;
  // se for recusado, é descartado e o painel volta ao token salvo. Em ambos os casos
  // o segredo sai da barra de endereço.
  useEffect(() => {
    if (!window.location.hash) return;
    const limpar = () =>
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const t = tokenDoFragmento();
    if (t === null) {
      limpar();
      return;
    }
    if (visao === undefined || t !== adminToken) return;
    if (visao?.acesso === "organizador") {
      salvarToken("admin", codigo, t);
      limpar();
    } else {
      limpar();
      rejeitarFragmento(t);
    }
  }, [codigo, adminToken, visao]);
  const agora = useAgora();

  if (adminToken === undefined || visao === undefined) return <Carregando />;
  if (visao === null) return <SessaoNaoEncontrada />;
  if (visao.acesso !== "organizador" || adminToken === null) {
    return (
      <PaginaFormulario titulo="Este acesso é do organizador." descricao="Para administrar a sessão, use o link de administração. Você também pode entrar como participante.">
        <Button asChild>
          <Link href={`/s/${codigo}`}>Entrar como participante</Link>
        </Button>
      </PaginaFormulario>
    );
  }

  const encerrada = visao.sessao.status === "encerrada";
  const referencia = instanteDeReferencia(visao.sessao, agora);
  return (
    <main id="conteudo" className="mx-auto max-w-6xl space-y-8 px-5 py-10 sm:px-8 sm:py-12">
      <CabecalhoSessao sessao={visao.sessao} organizador />
      {encerrada && <AvisoEncerrada />}
      <Compartilhar codigo={visao.sessao.codigo} adminToken={adminToken} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <ListaPerguntas
            perguntas={visao.abertas}
            acao={(p) => (
              <BotaoResponder adminToken={adminToken} perguntaId={p.id} desativado={encerrada} />
            )}
          />
          <Respondidas perguntas={visao.respondidas} />
        </div>
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="clima-titulo" className="space-y-4 rounded-xl border bg-white p-6">
            <h2 id="clima-titulo" className="font-semibold tracking-tight">Como está a sala</h2>
            <ResumoEstados participantes={visao.participantes} referencia={referencia} />
          </section>
          <ListaParticipantes participantes={visao.participantes} referencia={referencia} />
        </div>
      </div>
      {!encerrada && <footer className="flex flex-col items-start gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Terminou o encontro? Encerre para deixar a sessão somente leitura.</p>
        <EncerrarSessao adminToken={adminToken} />
      </footer>}
    </main>
  );
}
