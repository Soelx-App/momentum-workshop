import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { estadoEfetivo, instanteDeReferencia } from "./estados";
import { criarSessao, entrar, novoTeste } from "./test.setup";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("sessoes.encerrarInativas", () => {
  test("encerra sessão sem atividade há mais de 2 h", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    vi.advanceTimersByTime(2 * HORA + 1000);
    expect(await t.mutation(internal.sessoes.encerrarInativas, {})).toBe(1);
    const visao = await t.query(api.sessoes.visao, { codigo });
    expect(visao?.sessao.status).toBe("encerrada");
  });

  test("preserva sessão com atividade recente", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    vi.advanceTimersByTime(110 * MINUTO);
    const bia = await entrar(t, codigo, "Bia");
    await t.mutation(api.perguntas.enviar, { token: bia, texto: "Ainda aqui?" });
    vi.advanceTimersByTime(20 * MINUTO);
    expect(await t.mutation(internal.sessoes.encerrarInativas, {})).toBe(0);
    const visao = await t.query(api.sessoes.visao, { codigo });
    expect(visao?.sessao.status).toBe("aberta");
  });
});

describe("sessão encerrada", () => {
  test("é somente leitura: rejeita entrada, pergunta, voto, estado e respondida", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t);
    const bia = await entrar(t, codigo, "Bia");
    const caio = await entrar(t, codigo, "Caio");
    const perguntaId = await t.mutation(api.perguntas.enviar, { token: bia, texto: "Antes?" });
    await t.mutation(api.sessoes.encerrar, { adminToken });

    const msg = "Esta sessão foi encerrada.";
    await expect(entrar(t, codigo, "Davi")).rejects.toThrow(msg);
    await expect(t.mutation(api.perguntas.enviar, { token: bia, texto: "Depois?" })).rejects.toThrow(msg);
    await expect(t.mutation(api.perguntas.alternarVoto, { token: caio, perguntaId })).rejects.toThrow(msg);
    await expect(
      t.mutation(api.participantes.definirEstado, { token: bia, estado: "feliz" }),
    ).rejects.toThrow(msg);
    await expect(
      t.mutation(api.perguntas.marcarRespondida, { adminToken, perguntaId }),
    ).rejects.toThrow(msg);

    const visao = await t.query(api.sessoes.visao, { codigo, token: caio });
    if (visao?.acesso !== "participante") throw new Error("esperava participante");
    expect(visao.abertas.map((p) => p.texto)).toEqual(["Antes?"]);
  });

  test("agendamento pendente não altera estado após encerramento e a tela fica congelada", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t);
    const bia = await entrar(t, codigo, "Bia");
    await t.mutation(api.participantes.definirEstado, { token: bia, estado: "estressado" });
    vi.advanceTimersByTime(30_000);
    await t.mutation(api.sessoes.encerrar, { adminToken });
    vi.advanceTimersByTime(60_000);
    await t.finishInProgressScheduledFunctions();

    const visao = await t.query(api.sessoes.visao, { codigo, token: bia });
    if (visao?.acesso !== "participante") throw new Error("esperava participante");
    expect(visao.eu.estado).toBe("estressado");
    const referencia = instanteDeReferencia(visao.sessao, Date.now());
    expect(estadoEfetivo(visao.eu, referencia)).toBe("estressado");
  });
});
