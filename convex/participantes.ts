import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { ESTADO_PADRAO, estadoValidator } from "./estados";
import {
  exigirAberta,
  exigirParticipante,
  gerarToken,
  registrarAtividade,
  sessaoPorCodigo,
} from "./lib/acesso";
import { ESTADO_DURACAO_MS, LIMITES, textoValido } from "./regras";

export const entrar = mutation({
  args: { codigo: v.string(), nome: v.string() },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const sessao = await sessaoPorCodigo(ctx, args.codigo);
    if (sessao === null) throw new ConvexError("Sessão não encontrada.");
    exigirAberta(sessao);
    const nome = textoValido(args.nome, LIMITES.nomeParticipante);
    if (nome === null) {
      throw new ConvexError(`Informe seu nome (até ${LIMITES.nomeParticipante} caracteres).`);
    }
    const token = gerarToken();
    await ctx.db.insert("participantes", {
      sessaoId: sessao._id,
      nome,
      token,
      estado: ESTADO_PADRAO,
    });
    await registrarAtividade(ctx, sessao);
    return { token };
  },
});

export const definirEstado = mutation({
  args: { token: v.string(), estado: estadoValidator },
  returns: v.null(),
  handler: async (ctx, { token, estado }): Promise<null> => {
    const { participante, sessao } = await exigirParticipante(ctx, token);
    if (estado === ESTADO_PADRAO) {
      await ctx.db.patch("participantes", participante._id, { estado, estadoExpiraEm: undefined });
    } else {
      const expiraEm = Date.now() + ESTADO_DURACAO_MS;
      await ctx.db.patch("participantes", participante._id, { estado, estadoExpiraEm: expiraEm });
      await ctx.scheduler.runAfter(ESTADO_DURACAO_MS, internal.participantes.expirarEstado, {
        participanteId: participante._id,
        expiraEm,
      });
    }
    await registrarAtividade(ctx, sessao);
    return null;
  },
});

/** Volta para Acompanhando só se a escolha agendada ainda vale e a sessão está aberta. */
export const expirarEstado = internalMutation({
  args: { participanteId: v.id("participantes"), expiraEm: v.number() },
  returns: v.null(),
  handler: async (ctx, { participanteId, expiraEm }): Promise<null> => {
    const participante = await ctx.db.get("participantes", participanteId);
    if (participante === null || participante.estadoExpiraEm !== expiraEm) return null;
    const sessao = await ctx.db.get("sessoes", participante.sessaoId);
    if (sessao === null || sessao.status === "encerrada") return null;
    await ctx.db.patch("participantes", participanteId, { estado: ESTADO_PADRAO, estadoExpiraEm: undefined });
    return null;
  },
});
