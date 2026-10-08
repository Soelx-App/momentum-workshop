"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { LIMITES, textoValido } from "@/convex/regras";
import { ErroAcao } from "@/components/pulse/erro-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarToken } from "@/lib/armazenamento";
import { useAcao } from "@/lib/use-acao";

export function FormCriarSessao() {
  const router = useRouter();
  const criar = useMutation(api.sessoes.criar);
  const { pendente, erro, executar } = useAcao();
  const [organizadorNome, setOrganizadorNome] = useState("");
  const [nome, setNome] = useState("");
  const valido =
    textoValido(organizadorNome, LIMITES.nomeOrganizador) !== null &&
    textoValido(nome, LIMITES.nomeSessao) !== null;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido || pendente) return;
    await executar(async () => {
      const { codigo, adminToken } = await criar({ nome, organizadorNome });
      salvarToken("admin", codigo, adminToken);
      router.push(`/s/${codigo}/organizador`);
    });
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={enviar} className="space-y-6">
          <p className="text-sm text-muted-foreground">Os dois campos são obrigatórios.</p>
          <div className="space-y-2">
            <Label htmlFor="organizador-nome">Seu nome</Label>
            <Input
              id="organizador-nome"
              value={organizadorNome}
              maxLength={LIMITES.nomeOrganizador}
              onChange={(e) => setOrganizadorNome(e.target.value)}
              autoComplete="name"
              placeholder="Como podemos chamar você?"
              required
              disabled={pendente}
              aria-describedby="organizador-ajuda"
            />
            <p id="organizador-ajuda" className="text-xs text-muted-foreground">Até {LIMITES.nomeOrganizador} caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessao-nome">Nome da sessão</Label>
            <Input
              id="sessao-nome"
              value={nome}
              maxLength={LIMITES.nomeSessao}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Workshop de ideias"
              required
              disabled={pendente}
              aria-describedby="sessao-ajuda"
            />
          </div>
          <p id="sessao-ajuda" className="-mt-3 text-xs text-muted-foreground">Até {LIMITES.nomeSessao} caracteres. Todos verão este nome.</p>
          <Button type="submit" className="w-full" disabled={!valido || pendente}>
            {pendente ? "Criando..." : "Criar sessão"}
          </Button>
          <ErroAcao mensagem={erro} />
        </form>
      </CardContent>
    </Card>
  );
}
