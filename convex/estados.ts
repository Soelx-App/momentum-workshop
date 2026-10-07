import { v, type Infer } from "convex/values";
import { ESTADO_DURACAO_MS } from "./regras";

export const estadoValidator = v.union(
  v.literal("acompanhando"),
  v.literal("feliz"),
  v.literal("triste"),
  v.literal("duvida"),
  v.literal("confuso"),
  v.literal("estressado"),
  v.literal("tedio"),
);

export type Estado = Infer<typeof estadoValidator>;

export const ESTADO_PADRAO: Estado = "acompanhando";

export const ESTADOS: ReadonlyArray<{ valor: Estado; rotulo: string; emoji: string }> = [
  { valor: "acompanhando", rotulo: "Acompanhando", emoji: "👀" },
  { valor: "feliz", rotulo: "Feliz", emoji: "😄" },
  { valor: "triste", rotulo: "Triste", emoji: "😢" },
  { valor: "duvida", rotulo: "Dúvida", emoji: "🤔" },
  { valor: "confuso", rotulo: "Confuso", emoji: "😕" },
  { valor: "estressado", rotulo: "Estressado", emoji: "😫" },
  { valor: "tedio", rotulo: "Tédio", emoji: "🥱" },
];

export function infoDoEstado(estado: Estado) {
  return ESTADOS.find((e) => e.valor === estado) ?? ESTADOS[0];
}

type ComEstado = { estado: Estado; estadoExpiraEm?: number };
type SessaoNoTempo = { status: "aberta" | "encerrada"; encerradaEm?: number };

/** Instante usado para avaliar expirações: o relógio, ou o encerramento se a sessão terminou. */
export function instanteDeReferencia(sessao: SessaoNoTempo, agora: number): number {
  if (sessao.status === "encerrada" && sessao.encerradaEm !== undefined) {
    return Math.min(agora, sessao.encerradaEm);
  }
  return agora;
}

export function estadoEfetivo(p: ComEstado, referencia: number): Estado {
  if (
    p.estado !== ESTADO_PADRAO &&
    p.estadoExpiraEm !== undefined &&
    p.estadoExpiraEm <= referencia
  ) {
    return ESTADO_PADRAO;
  }
  return p.estado;
}

/** Segundos até voltar para Acompanhando; null quando não há contagem. */
export function segundosRestantes(
  p: ComEstado,
  sessao: SessaoNoTempo,
  agora: number,
): number | null {
  if (sessao.status === "encerrada" || p.estadoExpiraEm === undefined) return null;
  if (estadoEfetivo(p, agora) === ESTADO_PADRAO) return null;
  return Math.min(ESTADO_DURACAO_MS / 1000, Math.ceil((p.estadoExpiraEm - agora) / 1000));
}
