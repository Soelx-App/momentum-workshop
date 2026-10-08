"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { LIMITES, textoValido } from "@/convex/regras";
import { AvisoEncerrada } from "@/components/pulse/estados-simples";
import { ErroAcao } from "@/components/pulse/erro-acao";
import { Button } from "@/components/ui/button";
import { PaginaFormulario } from "@/components/pulse/pagina-formulario";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarToken } from "@/lib/armazenamento";
import { useAcao } from "@/lib/use-acao";
import type { SessaoVisao } from "@/lib/tipos";

export function EntrarNaSala({ sessao }: { sessao: SessaoVisao }) {
  const entrar = useMutation(api.participantes.entrar);
  const { pendente, erro, executar } = useAcao();
  const [nome, setNome] = useState("");
  const valido = textoValido(nome, LIMITES.nomeParticipante) !== null;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido || pendente || sessao.status === "encerrada") return;
    await executar(async () => {
      const { token } = await entrar({ codigo: sessao.codigo, nome });
      salvarToken("participante", sessao.codigo, token);
    });
  }

  return (
    <PaginaFormulario titulo={sessao.nome} descricao={`Organizado por ${sessao.organizadorNome}. Você está no lugar certo.`}>
      <Card>
        <CardContent>
          {sessao.status === "encerrada" ? (
            <AvisoEncerrada visitante />
          ) : (
            <form onSubmit={enviar} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Seu nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  maxLength={LIMITES.nomeParticipante}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                  required
                  disabled={pendente}
                  placeholder="Como podemos chamar você?"
                  aria-describedby="nome-ajuda"
                />
              </div>
              <p id="nome-ajuda" className="text-sm text-muted-foreground">Seu nome aparece na sala. Até {LIMITES.nomeParticipante} caracteres.</p>
              <Button type="submit" className="w-full" disabled={!valido || pendente}>
                {pendente ? "Entrando..." : "Entrar na sessão"}
              </Button>
              <ErroAcao mensagem={erro} />
            </form>
          )}
        </CardContent>
      </Card>
    </PaginaFormulario>
  );
}
