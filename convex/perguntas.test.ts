import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { criarSessao, entrar, novoTeste, type TesteConvex } from "./test.setup";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

async function cenario() {
  const t = novoTeste();
  const { codigo, adminToken } = await criarSessao(t);
  const bia = await entrar(t, codigo, "Bia");
  const caio = await entrar(t, codigo, "Caio");
  const davi = await entrar(t, codigo, "Davi");
  return { t, codigo, adminToken, bia, caio, davi };
}

async function perguntar(t: TesteConvex, token: string, texto: string) {
  const id = await t.mutation(api.perguntas.enviar, { token, texto });
  vi.advanceTimersByTime(1000);
  return id;
}

async function votar(t: TesteConvex, token: string, perguntaId: Id<"perguntas">) {
  return await t.mutation(api.perguntas.alternarVoto, { token, perguntaId });
}

async function abertasDe(t: TesteConvex, codigo: string, token: string) {
  const visao = await t.query(api.sessoes.visao, { codigo, token });
  if (visao?.acesso !== "participante") throw new Error("esperava participante");
  return visao.abertas;
}

describe("perguntas.enviar", () => {
  test("pergunta aparece para participantes e organizador, com texto aparado", async () => {
    const { t, codigo, adminToken, bia, caio } = await cenario();
    await perguntar(t, bia, "  Como funciona o deploy?  ");
    const paraCaio = await abertasDe(t, codigo, caio);
    expect(paraCaio).toHaveLength(1);
    expect(paraCaio[0]).toMatchObject({
      texto: "Como funciona o deploy?", autorNome: "Bia", votos: 0, minha: false, votei: false,
    });
    expect((await abertasDe(t, codigo, bia))[0].minha).toBe(true);
    const doOrganizador = await t.query(api.sessoes.visao, { codigo, adminToken });
    if (doOrganizador?.acesso !== "organizador") throw new Error("esperava organizador");
    expect(doOrganizador.abertas[0]).toMatchObject({ minha: false, votei: false });
  });

  test("aceita 280 caracteres e rejeita 281, vazio ou só espaços", async () => {
    const { t, bia } = await cenario();
    await expect(perguntar(t, bia, "a".repeat(280))).resolves.toBeDefined();
    await expect(perguntar(t, bia, "a".repeat(281))).rejects.toThrow("de 1 a 280 caracteres");
    await expect(perguntar(t, bia, "   ")).rejects.toThrow("de 1 a 280 caracteres");
  });

  test("token inválido é rejeitado", async () => {
    const { t } = await cenario();
    await expect(perguntar(t, "invalido", "Oi?")).rejects.toThrow("Acesso inválido");
  });
});

describe("perguntas.alternarVoto", () => {
  test("primeiro clique vota, segundo retira, e o contador acompanha os registros", async () => {
    const { t, codigo, bia, caio } = await cenario();
    const id = await perguntar(t, bia, "Pergunta?");
    expect(await votar(t, caio, id)).toEqual({ votei: true });
    let abertas = await abertasDe(t, codigo, caio);
    expect(abertas[0]).toMatchObject({ votos: 1, votei: true });
    expect(await votar(t, caio, id)).toEqual({ votei: false });
    abertas = await abertasDe(t, codigo, caio);
    expect(abertas[0]).toMatchObject({ votos: 0, votei: false });
    const registros = await t.run(async (ctx) => await ctx.db.query("votos").collect());
    expect(registros).toHaveLength(0);
  });

  test("não permite votar na própria pergunta", async () => {
    const { t, bia } = await cenario();
    const id = await perguntar(t, bia, "Minha?");
    await expect(votar(t, bia, id)).rejects.toThrow("Você não pode votar na sua própria pergunta.");
  });

  test("não permite votar em pergunta de outra sessão", async () => {
    const { t, bia } = await cenario();
    const outra = await criarSessao(t, "Outra");
    const intruso = await entrar(t, outra.codigo, "Eva");
    const id = await perguntar(t, bia, "Pergunta?");
    await expect(votar(t, intruso, id)).rejects.toThrow("Pergunta não encontrada.");
  });

  test("ranking por votos e, no empate, a mais antiga primeiro", async () => {
    const { t, codigo, bia, caio, davi } = await cenario();
    const p1 = await perguntar(t, bia, "P1");
    const p2 = await perguntar(t, caio, "P2");
    const p3 = await perguntar(t, davi, "P3");
    const p4 = await perguntar(t, bia, "P4");
    await votar(t, bia, p2);
    await votar(t, davi, p2);
    await votar(t, bia, p3);
    const ordem = (await abertasDe(t, codigo, bia)).map((p) => p.id);
    expect(ordem).toEqual([p2, p3, p1, p4]);
  });
});

describe("perguntas.marcarRespondida", () => {
  test("organizador marca; sai das abertas de todos e vai para Respondidas", async () => {
    const { t, codigo, adminToken, bia, caio } = await cenario();
    const id = await perguntar(t, bia, "Respondida?");
    await votar(t, caio, id);
    await t.mutation(api.perguntas.marcarRespondida, { adminToken, perguntaId: id });
    expect(await abertasDe(t, codigo, caio)).toEqual([]);
    const visao = await t.query(api.sessoes.visao, { codigo, token: caio });
    if (visao?.acesso !== "participante") throw new Error("esperava participante");
    expect(visao.respondidas).toEqual([
      { id, texto: "Respondida?", autorNome: "Bia", votos: 1, respondidaEm: Date.now() },
    ]);
    await expect(votar(t, caio, id)).rejects.toThrow("Esta pergunta já foi respondida.");
    await expect(
      t.mutation(api.perguntas.marcarRespondida, { adminToken, perguntaId: id }),
    ).rejects.toThrow("Esta pergunta já foi respondida.");
  });

  test("participante e organizador de outra sessão não podem marcar", async () => {
    const { t, bia, caio } = await cenario();
    const outra = await criarSessao(t, "Outra");
    const id = await perguntar(t, bia, "Pergunta?");
    await expect(
      t.mutation(api.perguntas.marcarRespondida, { adminToken: caio, perguntaId: id }),
    ).rejects.toThrow("Você não tem acesso de organizador a esta sessão.");
    await expect(
      t.mutation(api.perguntas.marcarRespondida, { adminToken: outra.adminToken, perguntaId: id }),
    ).rejects.toThrow("Pergunta não encontrada.");
  });
});
