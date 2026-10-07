import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  ATIVIDADE_INTERVALO_MS,
  CODIGO_ALFABETO,
  CODIGO_TAMANHO,
  normalizarCodigo,
} from "../regras";

export function gerarToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sessaoPorCodigo(ctx: QueryCtx, codigo: string) {
  return await ctx.db
    .query("sessoes")
    .withIndex("by_codigo", (q) => q.eq("codigo", normalizarCodigo(codigo)))
    .unique();
}

export async function gerarCodigoUnico(ctx: MutationCtx): Promise<string> {
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const bytes = new Uint8Array(CODIGO_TAMANHO);
    crypto.getRandomValues(bytes);
    // 256 é múltiplo de 32, então o módulo não enviesa a distribuição.
    const codigo = Array.from(bytes, (b) => CODIGO_ALFABETO[b % CODIGO_ALFABETO.length]).join("");
    if ((await sessaoPorCodigo(ctx, codigo)) === null) return codigo;
  }
  throw new ConvexError("Não foi possível gerar um código. Tente novamente.");
}

export async function participantePorToken(ctx: QueryCtx, token: string) {
  return await ctx.db
    .query("participantes")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

export function exigirAberta(sessao: Doc<"sessoes">): void {
  if (sessao.status === "encerrada") {
    throw new ConvexError("Esta sessão foi encerrada.");
  }
}

export async function exigirParticipante(ctx: MutationCtx, token: string) {
  const participante = await participantePorToken(ctx, token);
  if (participante === null) {
    throw new ConvexError("Acesso inválido. Entre na sessão novamente.");
  }
  const sessao = await ctx.db.get("sessoes", participante.sessaoId);
  if (sessao === null) throw new ConvexError("Sessão não encontrada.");
  exigirAberta(sessao);
  return { participante, sessao };
}

export async function exigirOrganizador(ctx: MutationCtx, adminToken: string) {
  const sessao = await ctx.db
    .query("sessoes")
    .withIndex("by_admin_token", (q) => q.eq("adminToken", adminToken))
    .unique();
  if (sessao === null) {
    throw new ConvexError("Você não tem acesso de organizador a esta sessão.");
  }
  return sessao;
}

/** Grava a atividade no máximo uma vez por minuto para evitar conflitos de escrita. */
export async function registrarAtividade(ctx: MutationCtx, sessao: Doc<"sessoes">) {
  const agora = Date.now();
  if (agora - sessao.ultimaAtividadeEm > ATIVIDADE_INTERVALO_MS) {
    await ctx.db.patch("sessoes", sessao._id, { ultimaAtividadeEm: agora });
  }
}
