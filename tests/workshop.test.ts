/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.{ts,js}");
const adminToken = "a".repeat(64);
const participantToken = "b".repeat(64);

async function createRoom(t: ReturnType<typeof convexTest>) {
  return await t.mutation(api.rooms.create, { organizerName: "Ana", adminToken });
}

describe("entrada e ciclo da sala", () => {
  it("normaliza nomes e retoma a participação apenas com a credencial do mesmo navegador", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createRoom(t);

    const participantId = await t.mutation(api.rooms.join, {
      roomId,
      name: "  Joana  ",
      participantToken,
    });
    const recoveredId = await t.mutation(api.rooms.join, {
      roomId,
      name: "joana",
      participantToken,
    });

    expect(recoveredId).toBe(participantId);
    await expect(t.mutation(api.rooms.join, {
      roomId,
      name: "Outra pessoa",
      participantToken,
    })).rejects.toThrow("já participa da sala");
    await expect(t.mutation(api.rooms.join, {
      roomId,
      name: "JOANA",
      participantToken: "c".repeat(64),
    })).rejects.toThrow("Esse nome já está em uso nesta sala.");
  });

  it("inicia e encerra a sessão somente pelo acesso do organizador", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createRoom(t);

    expect(await t.query(api.rooms.getPublic, { roomId })).toMatchObject({ status: "waiting" });
    await expect(t.mutation(api.rooms.start, { roomId, adminToken: participantToken })).rejects.toThrow("ACCESS_DENIED");
    await t.mutation(api.rooms.start, { roomId, adminToken });
    expect(await t.query(api.rooms.getAdmin, { roomId, adminToken })).toMatchObject({ status: "ok", room: { status: "active" } });
    await t.mutation(api.rooms.end, { roomId, adminToken });
    expect(await t.query(api.rooms.getPublic, { roomId })).toMatchObject({ status: "ended" });
    await expect(t.mutation(api.rooms.join, { roomId, name: "Bia", participantToken })).rejects.toThrow("encerrada");
  });

  it("preserva perguntas após encerrar e bloqueia todas as alterações da sala", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createRoom(t);
    const participantToken = "b".repeat(64);
    await t.mutation(api.rooms.join, { roomId, name: "Joana", participantToken });
    const questionId = await t.mutation(api.questions.ask, { roomId, participantToken, body: "Dúvida preservada" });
    await t.mutation(api.rooms.end, { roomId, adminToken });
    await expect(t.mutation(api.questions.ask, { roomId, participantToken, body: "Outra dúvida" })).rejects.toThrow("encerrada");
    await expect(t.mutation(api.questions.vote, { roomId, participantToken, questionId })).rejects.toThrow("encerrada");
    await expect(t.mutation(api.rooms.setMoodInterval, { roomId, adminToken, intervalMs: 15_000 })).rejects.toThrow("encerrada");
    expect(await t.query(api.questions.forParticipant, { roomId, participantToken })).toMatchObject({
      status: "ended", questions: [{ body: "Dúvida preservada", voteCount: 0 }],
    });
  });
});

describe("perguntas e votos", () => {
  it("publica perguntas, impede voto próprio e voto duplicado, e congela votos ao responder", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createRoom(t);
    const authorToken = "b".repeat(64);
    const voterToken = "c".repeat(64);
    await t.mutation(api.rooms.join, { roomId, name: "Joana", participantToken: authorToken });
    await t.mutation(api.rooms.join, { roomId, name: "Bia", participantToken: voterToken });

    const questionId = await t.mutation(api.questions.ask, {
      roomId,
      participantToken: authorToken,
      body: "Pode repetir este conceito?",
    });
    await expect(t.mutation(api.questions.vote, { roomId, participantToken: authorToken, questionId })).rejects.toThrow("própria pergunta");
    expect(await t.mutation(api.questions.vote, { roomId, participantToken: voterToken, questionId })).toEqual({ voted: true });
    expect(await t.query(api.questions.forParticipant, { roomId, participantToken: authorToken })).toMatchObject({
      questions: [{ body: "Pode repetir este conceito?", authorName: "Joana", voteCount: 1 }],
    });
    expect(await t.mutation(api.questions.vote, { roomId, participantToken: voterToken, questionId })).toEqual({ voted: false });
    expect(await t.mutation(api.questions.vote, { roomId, participantToken: voterToken, questionId })).toEqual({ voted: true });
    await t.mutation(api.questions.markAnswered, { roomId, adminToken, questionId });
    await expect(t.mutation(api.questions.vote, { roomId, participantToken: voterToken, questionId })).rejects.toThrow("respondida");
    expect(await t.query(api.questions.forParticipant, { roomId, participantToken: voterToken })).toMatchObject({
      questions: [{ status: "answered", voteCount: 1 }],
    });
    expect(await t.query(api.questions.forParticipant, { roomId, participantToken: voterToken })).not.toHaveProperty("voters");
    await expect(t.query(api.questions.forOrganizer, { roomId, adminToken: "f".repeat(64) })).rejects.toThrow("ACCESS_DENIED");
  });
});

describe("coletas de mood e painel", () => {
  it("salva uma resposta imutável por coleta e calcula médias apenas com respostas daquele intervalo", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createRoom(t);
    const people = ["b", "c", "d", "e"].map((letter) => letter.repeat(64));
    const names = ["Joana", "Bia", "Caio", "Lia"];
    for (let i = 0; i < people.length; i++) {
      await t.mutation(api.rooms.join, { roomId, name: names[i], participantToken: people[i] });
    }
    await t.mutation(api.rooms.setMoodInterval, { roomId, adminToken, intervalMs: 30_000 });
    await expect(t.mutation(api.moods.submit, { roomId, participantToken: people[0], value: 0 })).rejects.toThrow("ativa");
    await t.mutation(api.rooms.start, { roomId, adminToken });

    for (let i = 0; i < 3; i++) {
      await t.mutation(api.moods.submit, { roomId, participantToken: people[i], value: [0, 3, 5][i] });
    }
    await expect(t.mutation(api.moods.submit, { roomId, participantToken: people[0], value: 4 })).rejects.toThrow("já respondeu");
    let dashboard = await t.query(api.rooms.getDashboard, { roomId, adminToken });
    expect(dashboard.collections).toMatchObject([{ number: 1, responseCount: 3, average: 8 / 3 }]);
    expect(dashboard.participants).toMatchObject([
      { name: "Joana", lastMood: 0 },
      { name: "Bia", lastMood: 3 },
      { name: "Caio", lastMood: 5 },
      { name: "Lia", lastMood: null },
    ]);

    await t.mutation(api.rooms.advanceMoodCollection, { roomId, adminToken });
    await t.mutation(api.moods.submit, { roomId, participantToken: people[0], value: 2 });
    dashboard = await t.query(api.rooms.getDashboard, { roomId, adminToken });
    expect(dashboard.collections).toMatchObject([
      { number: 1, responseCount: 3, average: 8 / 3 },
      { number: 2, responseCount: 1, average: 2 },
    ]);
  });

  it("abre uma lacuna quando uma coleta não recebe respostas", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createRoom(t);
    const participantToken = "e".repeat(64);
    await t.mutation(api.rooms.join, { roomId, name: "Lia", participantToken });
    await t.mutation(api.rooms.start, { roomId, adminToken });
    await t.mutation(api.rooms.advanceMoodCollection, { roomId, adminToken });
    await t.mutation(api.moods.submit, { roomId, participantToken, value: 5 });
    const dashboard = await t.query(api.rooms.getDashboard, { roomId, adminToken });
    expect(dashboard.collections).toMatchObject([
      { number: 1, responseCount: 0, average: null },
      { number: 2, responseCount: 1, average: 5 },
    ]);
  });

  it("usa a coleta mais recente para o último estado mesmo quando os envios compartilham o mesmo timestamp", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    try {
      const t = convexTest(schema, modules);
      const roomId = await createRoom(t);
      const participantToken = "e".repeat(64);
      await t.mutation(api.rooms.join, { roomId, name: "Lia", participantToken });
      await t.mutation(api.rooms.start, { roomId, adminToken });
      await t.mutation(api.moods.submit, { roomId, participantToken, value: 0 });
      await t.mutation(api.rooms.advanceMoodCollection, { roomId, adminToken });
      await t.mutation(api.moods.submit, { roomId, participantToken, value: 5 });
      expect((await t.query(api.rooms.getDashboard, { roomId, adminToken })).participants[0].lastMood).toBe(5);
    } finally { now.mockRestore(); }
  });

  it("abre coletas automaticamente no intervalo configurado", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const roomId = await createRoom(t);
      await t.mutation(api.rooms.setMoodInterval, { roomId, adminToken, intervalMs: 15_000 });
      await t.mutation(api.rooms.start, { roomId, adminToken });
      expect((await t.query(api.rooms.getDashboard, { roomId, adminToken })).collections).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(15_000);
      await t.finishInProgressScheduledFunctions();
      expect((await t.query(api.rooms.getDashboard, { roomId, adminToken })).collections.map((item) => item.number)).toEqual([1, 2]);
    } finally { vi.useRealTimers(); }
  });

  it("recusa intervalos fora do limite e reinicia o prazo ao alterar a configuração", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const roomId = await createRoom(t);
      for (const intervalMs of [14_999, 3_600_001]) {
        await expect(t.mutation(api.rooms.setMoodInterval, { roomId, adminToken, intervalMs })).rejects.toThrow("entre 15 segundos e 60 minutos");
      }
      await t.mutation(api.rooms.setMoodInterval, { roomId, adminToken, intervalMs: 15_000 });
      await t.mutation(api.rooms.start, { roomId, adminToken });
      await vi.advanceTimersByTimeAsync(10_000);
      await t.mutation(api.rooms.setMoodInterval, { roomId, adminToken, intervalMs: 30_000 });
      await vi.advanceTimersByTimeAsync(5_000);
      await t.finishInProgressScheduledFunctions();
      expect((await t.query(api.rooms.getDashboard, { roomId, adminToken })).collections).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(25_000);
      await t.finishInProgressScheduledFunctions();
      expect((await t.query(api.rooms.getDashboard, { roomId, adminToken })).collections.map((item) => item.number)).toEqual([1, 2]);
    } finally { vi.useRealTimers(); }
  });

  it("agrega as respostas de uma sala com 40 participantes sem misturar identidades", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createRoom(t);
    const people = Array.from({ length: 40 }, (_, index) => ({
      name: `Pessoa ${index + 1}`,
      participantToken: (index + 1).toString(16).padStart(64, "0"),
    }));
    await Promise.all(people.map((person) => t.mutation(api.rooms.join, { roomId, ...person })));
    await t.mutation(api.rooms.start, { roomId, adminToken });
    await Promise.all(people.map((person, index) => t.mutation(api.moods.submit, {
      roomId,
      participantToken: person.participantToken,
      value: index % 6,
    })));

    const dashboard = await t.query(api.rooms.getDashboard, { roomId, adminToken });
    expect(dashboard.participants).toHaveLength(40);
    expect(dashboard.collections).toMatchObject([{ responseCount: 40, average: 2.4 }]);
  });
});
