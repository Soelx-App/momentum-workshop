"use client";

import { ConvexError } from "convex/values";
import { useState } from "react";

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ConvexError && typeof erro.data === "string") return erro.data;
  return "Não foi possível concluir a ação. Verifique a conexão e tente novamente.";
}

export function useAcao() {
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(fn: () => Promise<unknown>): Promise<boolean> {
    setPendente(true);
    setErro(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setErro(mensagemDeErro(e));
      return false;
    } finally {
      setPendente(false);
    }
  }

  return { pendente, erro, executar };
}
