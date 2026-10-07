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
  const recente = memoria.get(k);
  if (recente !== undefined) return recente;
  try {
    return window.localStorage.getItem(k);
  } catch {
    // Armazenamento indisponível (modo privado, bloqueio): só a memória vale.
    return null;
  }
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
  window.addEventListener("hashchange", avisar);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener("storage", avisar);
    window.removeEventListener("hashchange", avisar);
  };
}

export function useTokenSalvo(papel: Papel, codigo: string): string | null | undefined {
  return useSyncExternalStore(
    assinar,
    () => lerToken(papel, codigo),
    () => undefined,
  );
}

const fragmentosRejeitados = new Set<string>();

/** Token do `#t=...` da URL, sem validar (null se ausente ou vazio). */
export function tokenDoFragmento(): string | null {
  const t = new URLSearchParams(window.location.hash.slice(1)).get("t");
  return t ? t : null;
}

/** Descarta um token de link que o servidor não aceitou como organizador. */
export function rejeitarFragmento(token: string): void {
  fragmentosRejeitados.add(token);
  ouvintes.forEach((avisar) => avisar());
}

function fragmentoCandidato(): string | null {
  const t = tokenDoFragmento();
  return t !== null && !fragmentosRejeitados.has(t) ? t : null;
}

/** Token do organizador: um `#t=...` ainda não rejeitado tem prioridade sobre o armazenado. */
export function useTokenAdmin(codigo: string): string | null | undefined {
  return useSyncExternalStore(
    assinar,
    () => fragmentoCandidato() ?? lerToken("admin", codigo),
    () => undefined,
  );
}
