"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAcao } from "@/lib/use-acao";
import type { PerguntaAberta } from "@/lib/tipos";

export function BotaoVoto({
  token,
  pergunta,
  desativado,
}: {
  token: string;
  pergunta: PerguntaAberta;
  desativado: boolean;
}) {
  const alternar = useMutation(api.perguntas.alternarVoto);
  const { pendente, erro, executar } = useAcao();
  if (pergunta.minha) return <Badge variant="secondary">Sua pergunta</Badge>;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={pergunta.votei ? "default" : "outline"}
        aria-pressed={pergunta.votei}
        disabled={desativado || pendente}
        onClick={() => executar(() => alternar({ token, perguntaId: pergunta.id }))}
      >
        {pergunta.votei ? "Votado ✓" : "Votar"}
      </Button>
      {erro && (
        <p role="alert" className="max-w-40 text-right text-xs text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
