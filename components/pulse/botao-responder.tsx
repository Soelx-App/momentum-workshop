"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useAcao } from "@/lib/use-acao";

export function BotaoResponder({
  adminToken,
  perguntaId,
  desativado,
}: {
  adminToken: string;
  perguntaId: Id<"perguntas">;
  desativado: boolean;
}) {
  const marcar = useMutation(api.perguntas.marcarRespondida);
  const { pendente, erro, executar } = useAcao();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={desativado || pendente}
        onClick={() => executar(() => marcar({ adminToken, perguntaId }))}
      >
        {pendente ? "Marcando..." : "Marcar respondida"}
      </Button>
      {erro && (
        <p role="alert" className="max-w-40 text-right text-xs text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
