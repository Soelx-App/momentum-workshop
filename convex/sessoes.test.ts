import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { criarSessao, entrar, novoTeste } from "./test.setup";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("sessoes.criar", () => {
  test("cria sessão aberta com código público e token secreto", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t, "  Aula de hoje ", " Ana ");
    expect(codigo).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(adminToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const visao = await t.query(api.sessoes.visao, { codigo });
    expect(visao).toEqual({
      acesso: "publico",
      sessao: { nome: "Aula de hoje", organizadorNome: "Ana", codigo, status: "aberta" },
    });
  });

  test("rejeita nomes vazios, só com espaços ou longos demais", async () => {
    const t = novoTeste();
    await expect(criarSessao(t, "   ", "Ana")).rejects.toThrow("Informe o nome da sessão");
    await expect(criarSessao(t, "Aula", "   ")).rejects.toThrow("Informe seu nome");
    await expect(criarSessao(t, "a".repeat(81), "Ana")).rejects.toThrow("Informe o nome da sessão");
    await expect(criarSessao(t, "Aula", "a".repeat(41))).rejects.toThrow("Informe seu nome");
    await expect(criarSessao(t, "a".repeat(80), "a".repeat(40))).resolves.toBeDefined();
  });

  test("gera códigos diferentes para sessões diferentes", async () => {
    const t = novoTeste();
    const a = await criarSessao(t);
    const b = await criarSessao(t);
    expect(a.codigo).not.toBe(b.codigo);
    expect(a.adminToken).not.toBe(b.adminToken);
  });
});

describe("participantes.entrar", () => {
  test("entra em Acompanhando e passa a ver a sessão completa", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    const token = await entrar(t, codigo, "  Bia ");
    const visao = await t.query(api.sessoes.visao, { codigo, token });
    expect(visao?.acesso).toBe("participante");
    if (visao?.acesso !== "participante") return;
    expect(visao.eu).toMatchObject({ nome: "Bia", estado: "acompanhando" });
    expect(visao.participantes.map((p) => p.nome)).toEqual(["Bia"]);
    expect(visao.abertas).toEqual([]);
    expect(visao.respondidas).toEqual([]);
  });

  test("entrar normaliza o código digitado", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    const token = await entrar(t, `  ${codigo.toLowerCase()} `, "Bia");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const visao = await t.query(api.sessoes.visao, { codigo: codigo.toLowerCase(), token });
    expect(visao?.acesso).toBe("participante");
  });

  test("código inexistente informa sessão não encontrada", async () => {
    const t = novoTeste();
    await expect(entrar(t, "ZZZZZZ", "Bia")).rejects.toThrow("Sessão não encontrada.");
    expect(await t.query(api.sessoes.visao, { codigo: "ZZZZZZ" })).toBeNull();
  });

  test("rejeita nome só com espaços ou acima de 40 caracteres", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    await expect(entrar(t, codigo, "   ")).rejects.toThrow("Informe seu nome");
    await expect(entrar(t, codigo, "a".repeat(41))).rejects.toThrow("Informe seu nome");
  });

  test("nome repetido cria outra participação, sem recuperar identidade", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t);
    const primeiro = await entrar(t, codigo, "Bia");
    const segundo = await entrar(t, codigo, "Bia");
    expect(primeiro).not.toBe(segundo);
    const visao = await t.query(api.sessoes.visao, { codigo, adminToken });
    if (visao?.acesso !== "organizador") throw new Error("esperava organizador");
    expect(visao.participantes).toHaveLength(2);
    expect(new Set(visao.participantes.map((p) => p.id)).size).toBe(2);
  });
});

describe("sessoes.visao — acesso", () => {
  test("organizador vê o painel com o adminToken certo", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t);
    const visao = await t.query(api.sessoes.visao, { codigo, adminToken });
    expect(visao?.acesso).toBe("organizador");
  });

  test("adminToken de outra sessão, código como token ou token inválido não dão acesso", async () => {
    const t = novoTeste();
    const a = await criarSessao(t);
    const b = await criarSessao(t);
    const tokenB = await entrar(t, b.codigo, "Caio");
    for (const args of [
      { codigo: a.codigo, adminToken: b.adminToken },
      { codigo: a.codigo, adminToken: a.codigo },
      { codigo: a.codigo, token: tokenB },
      { codigo: a.codigo, token: "invalido" },
    ]) {
      const visao = await t.query(api.sessoes.visao, args);
      expect(visao?.acesso).toBe("publico");
      expect(visao).not.toHaveProperty("abertas");
      expect(visao).not.toHaveProperty("participantes");
    }
  });

  test("nenhuma visão devolve tokens", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t);
    const token = await entrar(t, codigo, "Bia");
    const visoes = [
      await t.query(api.sessoes.visao, { codigo }),
      await t.query(api.sessoes.visao, { codigo, token }),
      await t.query(api.sessoes.visao, { codigo, adminToken }),
    ];
    for (const visao of visoes) {
      const json = JSON.stringify(visao);
      expect(json).not.toContain(adminToken);
      expect(json).not.toContain(token);
    }
  });
});

describe("sessoes.encerrar", () => {
  test("organizador encerra; repetir não muda nada; entrada passa a ser recusada", async () => {
    const t = novoTeste();
    const { codigo, adminToken } = await criarSessao(t);
    await t.mutation(api.sessoes.encerrar, { adminToken });
    const visao = await t.query(api.sessoes.visao, { codigo });
    expect(visao?.sessao.status).toBe("encerrada");
    expect(visao?.sessao.encerradaEm).toBe(Date.now());
    vi.advanceTimersByTime(5000);
    await t.mutation(api.sessoes.encerrar, { adminToken });
    const depois = await t.query(api.sessoes.visao, { codigo });
    expect(depois?.sessao.encerradaEm).toBe(visao?.sessao.encerradaEm);
    await expect(entrar(t, codigo, "Bia")).rejects.toThrow("Esta sessão foi encerrada.");
  });

  test("código público ou token de participante não encerram a sessão", async () => {
    const t = novoTeste();
    const { codigo } = await criarSessao(t);
    const token = await entrar(t, codigo, "Bia");
    await expect(t.mutation(api.sessoes.encerrar, { adminToken: codigo })).rejects.toThrow(
      "Você não tem acesso de organizador a esta sessão.",
    );
    await expect(t.mutation(api.sessoes.encerrar, { adminToken: token })).rejects.toThrow(
      "Você não tem acesso de organizador a esta sessão.",
    );
  });
});
