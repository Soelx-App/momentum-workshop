"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { LIMITES, textoValido } from "@/convex/regras";
import { AvisoEncerrada } from "@/components/pulse/estados-simples";
import { ErroAcao } from "@/components/pulse/erro-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    await executar(async () => {
      const { token } = await entrar({ codigo: sessao.codigo, nome });
      salvarToken("participante", sessao.codigo, token);
    });
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{sessao.nome}</CardTitle>
          <CardDescription>Organizado por {sessao.organizadorNome}</CardDescription>
        </CardHeader>
        <CardContent>
          {sessao.status === "encerrada" ? (
            <AvisoEncerrada />
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Seu nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  maxLength={LIMITES.nomeParticipante}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!valido || pendente}>
                {pendente ? "Entrando..." : "Entrar na sessão"}
              </Button>
              <ErroAcao mensagem={erro} />
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
