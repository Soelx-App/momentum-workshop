"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setFalhou(false);
      setCopiado(true);
      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setCopiado(false), 2000);
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
        <>
          <p role="alert" className="text-xs text-destructive">
            Não foi possível copiar. Selecione o texto abaixo e copie manualmente.
          </p>
          <Input
            readOnly
            value={texto}
            aria-label={rotulo}
            onFocus={(e) => e.currentTarget.select()}
          />
        </>
      )}
    </div>
  );
}
