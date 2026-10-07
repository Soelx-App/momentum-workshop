"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setFalhou(false);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setFalhou(true);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" onClick={copiar}>
        {copiado ? "Copiado!" : rotulo}
      </Button>
      {falhou && (
        <p role="alert" className="text-xs text-destructive">
          Não foi possível copiar. Selecione o texto e copie manualmente.
        </p>
      )}
    </div>
  );
}
