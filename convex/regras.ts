export const LIMITES = {
  nomeOrganizador: 40,
  nomeSessao: 80,
  nomeParticipante: 40,
  pergunta: 280,
} as const;

export const CODIGO_ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODIGO_TAMANHO = 6;

export const ESTADO_DURACAO_MS = 60_000;
export const INATIVIDADE_MS = 2 * 60 * 60 * 1000;
export const ATIVIDADE_INTERVALO_MS = 60_000;

/** Texto sem espaços nas pontas, ou null se ficar vazio ou passar do limite. */
export function textoValido(valor: string, maximo: number): string | null {
  const limpo = valor.trim();
  if (limpo.length === 0 || limpo.length > maximo) return null;
  return limpo;
}

export function normalizarCodigo(valor: string): string {
  return valor.trim().toUpperCase();
}
