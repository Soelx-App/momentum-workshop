import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { ESTADO_PADRAO } from "./estados";
import { exigirAberta, gerarToken, registrarAtividade, sessaoPorCodigo } from "./lib/acesso";
import { LIMITES, textoValido } from "./regras";

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
