import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  exigirAberta,
  exigirOrganizador,
  exigirParticipante,
  registrarAtividade,
} from "./lib/acesso";
import { LIMITES, textoValido } from "./regras";

export const enviar = mutation({
  args: { token: v.string(), texto: v.string() },
  returns: v.id("perguntas"),
  handler: async (ctx, args) => {
    const { participante, sessao } = await exigirParticipante(ctx, args.token);
    const texto = textoValido(args.texto, LIMITES.pergunta);
    if (texto === null) {
      throw new ConvexError(`A pergunta precisa ter de 1 a ${LIMITES.pergunta} caracteres.`);
    }
    const id = await ctx.db.insert("perguntas", {
      sessaoId: sessao._id,
      autorId: participante._id,
      texto,
      status: "aberta",
      votos: 0,
    });
    await registrarAtividade(ctx, sessao);
    return id;
  },
});

export const alternarVoto = mutation({
  args: { token: v.string(), perguntaId: v.id("perguntas") },
  returns: v.object({ votei: v.boolean() }),
  handler: async (ctx, { token, perguntaId }) => {
    const { participante, sessao } = await exigirParticipante(ctx, token);
    const pergunta = await ctx.db.get("perguntas", perguntaId);
    if (pergunta === null || pergunta.sessaoId !== sessao._id) {
      throw new ConvexError("Pergunta não encontrada.");
    }
    if (pergunta.status !== "aberta") throw new ConvexError("Esta pergunta já foi respondida.");
    if (pergunta.autorId === participante._id) {
      throw new ConvexError("Você não pode votar na sua própria pergunta.");
    }
    const existente = await ctx.db
      .query("votos")
      .withIndex("by_pergunta_participante", (q) =>
        q.eq("perguntaId", perguntaId).eq("participanteId", participante._id),
      )
      .unique();
    if (existente !== null) {
      await ctx.db.delete("votos", existente._id);
      await ctx.db.patch("perguntas", perguntaId, { votos: Math.max(0, pergunta.votos - 1) });
    } else {
      await ctx.db.insert("votos", {
        sessaoId: sessao._id,
        perguntaId,
        participanteId: participante._id,
      });
      await ctx.db.patch("perguntas", perguntaId, { votos: pergunta.votos + 1 });
    }
    await registrarAtividade(ctx, sessao);
    return { votei: existente === null };
  },
});

export const marcarRespondida = mutation({
  args: { adminToken: v.string(), perguntaId: v.id("perguntas") },
  returns: v.null(),
  handler: async (ctx, { adminToken, perguntaId }) => {
    const sessao = await exigirOrganizador(ctx, adminToken);
    exigirAberta(sessao);
    const pergunta = await ctx.db.get("perguntas", perguntaId);
    if (pergunta === null || pergunta.sessaoId !== sessao._id) {
      throw new ConvexError("Pergunta não encontrada.");
    }
    if (pergunta.status !== "aberta") throw new ConvexError("Esta pergunta já foi respondida.");
    await ctx.db.patch("perguntas", perguntaId, { status: "respondida", respondidaEm: Date.now() });
    await registrarAtividade(ctx, sessao);
    return null;
  },
});
