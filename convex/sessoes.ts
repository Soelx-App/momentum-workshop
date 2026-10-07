import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { estadoValidator } from "./estados";
import {
  exigirOrganizador,
  gerarCodigoUnico,
  gerarToken,
  participantePorToken,
  sessaoPorCodigo,
} from "./lib/acesso";
import { LIMITES, textoValido } from "./regras";

const statusSessao = v.union(v.literal("aberta"), v.literal("encerrada"));

const sessaoVisao = v.object({
  nome: v.string(),
  organizadorNome: v.string(),
  codigo: v.string(),
  status: statusSessao,
  encerradaEm: v.optional(v.number()),
});

const participanteVisao = v.object({
  id: v.id("participantes"),
  nome: v.string(),
  estado: estadoValidator,
  estadoExpiraEm: v.optional(v.number()),
});

const perguntaAberta = v.object({
  id: v.id("perguntas"),
  texto: v.string(),
  autorNome: v.string(),
  votos: v.number(),
  criadaEm: v.number(),
  minha: v.boolean(),
  votei: v.boolean(),
});

const perguntaRespondida = v.object({
  id: v.id("perguntas"),
  texto: v.string(),
  autorNome: v.string(),
  votos: v.number(),
  respondidaEm: v.number(),
});

const conteudoMembro = {
  sessao: sessaoVisao,
  abertas: v.array(perguntaAberta),
  respondidas: v.array(perguntaRespondida),
  participantes: v.array(participanteVisao),
};

export const criar = mutation({
  args: { nome: v.string(), organizadorNome: v.string() },
  returns: v.object({ codigo: v.string(), adminToken: v.string() }),
  handler: async (ctx, args) => {
    const nome = textoValido(args.nome, LIMITES.nomeSessao);
    if (nome === null) {
      throw new ConvexError(`Informe o nome da sessão (até ${LIMITES.nomeSessao} caracteres).`);
    }
    const organizadorNome = textoValido(args.organizadorNome, LIMITES.nomeOrganizador);
    if (organizadorNome === null) {
      throw new ConvexError(`Informe seu nome (até ${LIMITES.nomeOrganizador} caracteres).`);
    }
    const codigo = await gerarCodigoUnico(ctx);
    const adminToken = gerarToken();
    await ctx.db.insert("sessoes", {
      nome,
      organizadorNome,
      codigo,
      adminToken,
      status: "aberta",
      ultimaAtividadeEm: Date.now(),
    });
    return { codigo, adminToken };
  },
});

export const encerrar = mutation({
  args: { adminToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { adminToken }) => {
    const sessao = await exigirOrganizador(ctx, adminToken);
    if (sessao.status === "encerrada") return null;
    await ctx.db.patch("sessoes", sessao._id, { status: "encerrada", encerradaEm: Date.now() });
    return null;
  },
});

function paraParticipanteVisao(p: Doc<"participantes">) {
  return { id: p._id, nome: p.nome, estado: p.estado, estadoExpiraEm: p.estadoExpiraEm };
}

export const visao = query({
  args: {
    codigo: v.string(),
    token: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({ acesso: v.literal("publico"), sessao: sessaoVisao }),
    v.object({ acesso: v.literal("participante"), eu: participanteVisao, ...conteudoMembro }),
    v.object({ acesso: v.literal("organizador"), ...conteudoMembro }),
  ),
  handler: async (ctx, args) => {
    const sessao = await sessaoPorCodigo(ctx, args.codigo);
    if (sessao === null) return null;

    const dadosSessao = {
      nome: sessao.nome,
      organizadorNome: sessao.organizadorNome,
      codigo: sessao.codigo,
      status: sessao.status,
      encerradaEm: sessao.encerradaEm,
    };

    const ehOrganizador = args.adminToken !== undefined && args.adminToken === sessao.adminToken;
    let eu: Doc<"participantes"> | null = null;
    if (!ehOrganizador && args.token !== undefined) {
      const participante = await participantePorToken(ctx, args.token);
      if (participante !== null && participante.sessaoId === sessao._id) eu = participante;
    }
    if (!ehOrganizador && eu === null) {
      return { acesso: "publico" as const, sessao: dadosSessao };
    }

    const participantes = await ctx.db
      .query("participantes")
      .withIndex("by_sessao", (q) => q.eq("sessaoId", sessao._id))
      .collect();
    const nomePorId = new Map(participantes.map((p) => [p._id, p.nome]));

    const euId = eu?._id;
    const meusVotos = new Set<Id<"perguntas">>();
    if (euId !== undefined) {
      const votos = await ctx.db
        .query("votos")
        .withIndex("by_participante", (q) => q.eq("participanteId", euId))
        .collect();
      for (const voto of votos) meusVotos.add(voto.perguntaId);
    }

    const abertasDocs = await ctx.db
      .query("perguntas")
      .withIndex("by_sessao_status", (q) => q.eq("sessaoId", sessao._id).eq("status", "aberta"))
      .collect();
    const abertas = abertasDocs
      .sort((a, b) => b.votos - a.votos || a._creationTime - b._creationTime)
      .map((p) => ({
        id: p._id,
        texto: p.texto,
        autorNome: nomePorId.get(p.autorId) ?? "",
        votos: p.votos,
        criadaEm: p._creationTime,
        minha: euId !== undefined && p.autorId === euId,
        votei: meusVotos.has(p._id),
      }));

    const respondidasDocs = await ctx.db
      .query("perguntas")
      .withIndex("by_sessao_status", (q) => q.eq("sessaoId", sessao._id).eq("status", "respondida"))
      .collect();
    const respondidas = respondidasDocs
      .map((p) => ({
        id: p._id,
        texto: p.texto,
        autorNome: nomePorId.get(p.autorId) ?? "",
        votos: p.votos,
        respondidaEm: p.respondidaEm ?? p._creationTime,
      }))
      .sort((a, b) => b.respondidaEm - a.respondidaEm);

    const conteudo = {
      sessao: dadosSessao,
      abertas,
      respondidas,
      participantes: participantes.map(paraParticipanteVisao),
    };
    if (eu === null) return { acesso: "organizador" as const, ...conteudo };
    return { acesso: "participante" as const, eu: paraParticipanteVisao(eu), ...conteudo };
  },
});
