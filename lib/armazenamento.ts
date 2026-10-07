"use client";

import { useSyncExternalStore } from "react";

export type Papel = "participante" | "admin";

const memoria = new Map<string, string>();
const ouvintes = new Set<() => void>();

function chave(papel: Papel, codigo: string) {
  return `pulse:${papel}:${codigo}`;
}

function lerToken(papel: Papel, codigo: string): string | null {
  const k = chave(papel, codigo);
  try {
    const salvo = window.localStorage.getItem(k);
    if (salvo !== null) return salvo;
  } catch {
    // Armazenamento indisponível (modo privado, bloqueio): usa a memória.
  }
  return memoria.get(k) ?? null;
}

export function salvarToken(papel: Papel, codigo: string, token: string): void {
  const k = chave(papel, codigo);
  memoria.set(k, token);
  try {
    window.localStorage.setItem(k, token);
  } catch {
    // Sem armazenamento, o app funciona, mas não reconhece o retorno.
  }
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

export function useTokenSalvo(papel: Papel, codigo: string): string | null | undefined {
  return useSyncExternalStore(
    assinar,
    () => lerToken(papel, codigo),
    () => undefined,
  );
}

function tokenDoFragmento(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get("t");
}

/** Token do organizador: o link `#t=...` tem prioridade sobre o armazenado. */
export function useTokenAdmin(codigo: string): string | null | undefined {
  return useSyncExternalStore(
    assinar,
    () => tokenDoFragmento() ?? lerToken("admin", codigo),
    () => undefined,
  );
}
