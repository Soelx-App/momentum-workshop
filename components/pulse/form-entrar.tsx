"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { CODIGO_TAMANHO, LIMITES, normalizarCodigo, textoValido } from "@/convex/regras";
import { ErroAcao } from "@/components/pulse/erro-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarToken } from "@/lib/armazenamento";
import { useAcao } from "@/lib/use-acao";

export function FormEntrar() {
  const router = useRouter();
  const entrar = useMutation(api.participantes.entrar);
  const { pendente, erro, executar } = useAcao();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const codigoNormalizado = normalizarCodigo(codigo);
  const valido =
    codigoNormalizado.length === CODIGO_TAMANHO &&
    textoValido(nome, LIMITES.nomeParticipante) !== null;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    await executar(async () => {
      const { token } = await entrar({ codigo: codigoNormalizado, nome });
      salvarToken("participante", codigoNormalizado, token);
      router.push(`/s/${codigoNormalizado}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participante</CardTitle>
        <CardDescription>Entre com o código que o organizador compartilhou.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código da sessão</Label>
            <Input
              id="codigo"
              value={codigo}
              maxLength={CODIGO_TAMANHO + 4}
              onChange={(e) => setCodigo(e.target.value)}
              className="font-mono uppercase tracking-widest"
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participante-nome">Seu nome</Label>
            <Input
              id="participante-nome"
              value={nome}
              maxLength={LIMITES.nomeParticipante}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!valido || pendente}>
            {pendente ? "Entrando..." : "Entrar"}
          </Button>
          <ErroAcao mensagem={erro} />
        </form>
      </CardContent>
    </Card>
  );
}
