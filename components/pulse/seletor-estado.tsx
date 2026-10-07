"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ESTADOS, estadoEfetivo, instanteDeReferencia, segundosRestantes } from "@/convex/estados";
import { ErroAcao } from "@/components/pulse/erro-acao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAcao } from "@/lib/use-acao";
import type { ParticipanteVisao, SessaoVisao } from "@/lib/tipos";

export function SeletorEstado({
  token,
  eu,
  sessao,
  agora,
}: {
  token: string;
  eu: ParticipanteVisao;
  sessao: SessaoVisao;
  agora: number;
}) {
  const definir = useMutation(api.participantes.definirEstado);
  const { pendente, erro, executar } = useAcao();
  const encerrada = sessao.status === "encerrada";
  const atual = estadoEfetivo(eu, instanteDeReferencia(sessao, agora));
  const restantes = segundosRestantes(eu, sessao, agora);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Como você está?</CardTitle>
        {restantes !== null && (
          <CardDescription>Volta para Acompanhando em {restantes}s</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ESTADOS.map((e) => (
            <Button
              key={e.valor}
              type="button"
              variant={atual === e.valor ? "default" : "outline"}
              aria-pressed={atual === e.valor}
              disabled={encerrada || pendente}
              onClick={() => executar(() => definir({ token, estado: e.valor }))}
            >
              {e.emoji} {e.rotulo}
            </Button>
          ))}
        </div>
        <ErroAcao mensagem={erro} />
      </CardContent>
    </Card>
  );
}
