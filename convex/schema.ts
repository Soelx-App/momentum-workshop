import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { estadoValidator } from "./estados";

export default defineSchema({
  sessoes: defineTable({
    nome: v.string(),
    organizadorNome: v.string(),
    codigo: v.string(),
    adminToken: v.string(),
    status: v.union(v.literal("aberta"), v.literal("encerrada")),
    ultimaAtividadeEm: v.number(),
    encerradaEm: v.optional(v.number()),
  })
    .index("by_codigo", ["codigo"])
    .index("by_admin_token", ["adminToken"])
    .index("by_status_atividade", ["status", "ultimaAtividadeEm"]),

  participantes: defineTable({
    sessaoId: v.id("sessoes"),
    nome: v.string(),
    token: v.string(),
    estado: estadoValidator,
    estadoExpiraEm: v.optional(v.number()),
  })
    .index("by_sessao", ["sessaoId"])
    .index("by_token", ["token"]),

  perguntas: defineTable({
    sessaoId: v.id("sessoes"),
    autorId: v.id("participantes"),
    texto: v.string(),
    status: v.union(v.literal("aberta"), v.literal("respondida")),
    votos: v.number(),
    respondidaEm: v.optional(v.number()),
  }).index("by_sessao_status", ["sessaoId", "status"]),

  votos: defineTable({
    sessaoId: v.id("sessoes"),
    perguntaId: v.id("perguntas"),
    participanteId: v.id("participantes"),
  })
    .index("by_pergunta_participante", ["perguntaId", "participanteId"])
    .index("by_participante", ["participanteId"]),

  // Legado do contador de exemplo. Mantida para o push do schema não falhar
  // em deployments que já têm documentos nela. Nenhum código a usa.
  counters: defineTable({ value: v.number() }),
});
