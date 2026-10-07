import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { criarSessao, entrar, novoTeste, type TesteConvex } from "./test.setup";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

async function euDe(t: TesteConvex, codigo: string, token: string) {
  const visao = await t.query(api.sessoes.visao, { codigo, token });
  if (visao?.acesso !== "participante") throw new Error("esperava participante");
  return visao.eu;
}

async function avancar(t: TesteConvex, ms: number) {
  vi.advanceTimersByTime(ms);
  await t.finishInProgressScheduledFunctions();
}

describe("participantes.definirEstado", () => {
  test("estado escolhido expira para Acompanhando após 60 s", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    const bia = await entrar(t, codigo, "Bia");
    const inicio = Date.now();
    await t.mutation(api.participantes.definirEstado, { token: bia, estado: "feliz" });
    expect(await euDe(t, codigo, bia)).toMatchObject({ estado: "feliz", estadoExpiraEm: inicio + 60_000 });
    await avancar(t, 59_000);
    expect((await euDe(t, codigo, bia)).estado).toBe("feliz");
    await avancar(t, 1_000);
    const eu = await euDe(t, codigo, bia);
    expect(eu.estado).toBe("acompanhando");
    expect(eu.estadoExpiraEm).toBeUndefined();
  });

  test("agendamento antigo não apaga escolha mais recente", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    const bia = await entrar(t, codigo, "Bia");
    await t.mutation(api.participantes.definirEstado, { token: bia, estado: "feliz" });
    await avancar(t, 30_000);
    await t.mutation(api.participantes.definirEstado, { token: bia, estado: "duvida" });
    await avancar(t, 30_000); // dispara o agendamento do "feliz"
    expect((await euDe(t, codigo, bia)).estado).toBe("duvida");
    await avancar(t, 30_000); // dispara o agendamento da "duvida"
    expect((await euDe(t, codigo, bia)).estado).toBe("acompanhando");
  });

  test("escolher Acompanhando remove a expiração", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    const bia = await entrar(t, codigo, "Bia");
    await t.mutation(api.participantes.definirEstado, { token: bia, estado: "tedio" });
    await t.mutation(api.participantes.definirEstado, { token: bia, estado: "acompanhando" });
    const eu = await euDe(t, codigo, bia);
    expect(eu.estado).toBe("acompanhando");
    expect(eu.estadoExpiraEm).toBeUndefined();
  });

  test("estado aparece para os outros membros e não muda ao responder a pergunta do autor", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t);
    const bia = await entrar(t, codigo, "Bia");
    const caio = await entrar(t, codigo, "Caio");
    await t.mutation(api.participantes.definirEstado, { token: bia, estado: "confuso" });
    const perguntaId = await t.mutation(api.perguntas.enviar, { token: bia, texto: "Hein?" });
    await t.mutation(api.perguntas.marcarRespondida, { adminToken, perguntaId });
    const visao = await t.query(api.sessoes.visao, { codigo, token: caio });
    if (visao?.acesso !== "participante") throw new Error("esperava participante");
    expect(visao.participantes.find((p) => p.nome === "Bia")?.estado).toBe("confuso");
  });

  test("token inválido é rejeitado", async () => {
    const t = novoTeste();
    await expect(
      t.mutation(api.participantes.definirEstado, { token: "x", estado: "feliz" }),
    ).rejects.toThrow("Acesso inválido");
  });
});
