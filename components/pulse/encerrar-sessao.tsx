"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { ErroAcao } from "@/components/pulse/erro-acao";
import { Button } from "@/components/ui/button";
import { useAcao } from "@/lib/use-acao";

export function EncerrarSessao({ adminToken }: { adminToken: string }) {
  const encerrar = useMutation(api.sessoes.encerrar);
  const { pendente, erro, executar } = useAcao();
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Button variant="outline" onClick={() => setConfirmando(true)}>
        Encerrar sessão
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-md border border-destructive p-3">
      <p className="text-sm">
        Confirmar encerramento? Ninguém poderá entrar, perguntar, votar ou trocar de estado.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pendente}
          onClick={() => executar(() => encerrar({ adminToken }))}
        >
          {pendente ? "Encerrando..." : "Confirmar encerramento"}
        </Button>
        <Button variant="outline" disabled={pendente} onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
      <ErroAcao mensagem={erro} />
    </div>
  );
}
