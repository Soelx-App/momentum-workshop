/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { requireRoomAdmin } from "../convex/lib/roomAccess";

const modules = import.meta.glob("../convex/**/*.{ts,js}");
const token = "a".repeat(64);
const otherToken = "b".repeat(64);

describe("salas e acessos", () => {
  it("persiste o nome normalizado e somente o hash da chave", async () => {
    const t = convexTest(schema, modules);
    const roomId = await t.mutation(api.rooms.create, { organizerName: "  Ana  ", adminToken: token });
    const stored = await t.run((ctx) => ctx.db.get(roomId));
    expect(stored?.organizerName).toBe("Ana");
    expect(stored?.adminTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored?.adminTokenHash).not.toBe(token);
    expect(stored).not.toHaveProperty("adminToken");
    expect(await t.query(api.rooms.getAdmin, { roomId, adminToken: token })).toEqual({
      status: "ok", room: {
        _id: roomId, organizerName: "Ana", _creationTime: stored?._creationTime,
        status: "waiting", moodIntervalMs: 60_000, currentCollectionNumber: 0,
      },
    });
  });

  it.each(["", "   ", "\n\t"])("recusa nome vazio %j sem criar sala", async (organizerName) => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.rooms.create, { organizerName, adminToken: token })).rejects.toThrow("Informe seu nome");
    expect(await t.run((ctx) => ctx.db.query("rooms").collect())).toEqual([]);
  });

  it("recusa chaves malformadas", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.rooms.create, { organizerName: "Ana", adminToken: "123" })).rejects.toThrow("Chave de administração inválida");
  });

  it("repetir uma criação não duplica a sala nem muda seu nome", async () => {
    const t = convexTest(schema, modules);
    const roomId = await t.mutation(api.rooms.create, { organizerName: "Ana", adminToken: token });
    const retry = await t.mutation(api.rooms.create, { organizerName: "Outro nome", adminToken: token });
    expect(retry).toBe(roomId);
    expect(await t.run((ctx) => ctx.db.query("rooms").collect())).toHaveLength(1);
    expect(await t.query(api.rooms.getAdmin, { roomId, adminToken: token })).toMatchObject({ room: { organizerName: "Ana" } });
  });

  it("o acesso público retorna só a identificação, sem nome ou credenciais", async () => {
    const t = convexTest(schema, modules);
    const roomId = await t.mutation(api.rooms.create, { organizerName: "Ana", adminToken: token });
    expect(await t.query(api.rooms.getPublic, { roomId })).toEqual({ _id: roomId, status: "waiting" });
  });

  it("recusa administração com chave ausente, inválida ou de outra sala", async () => {
    const t = convexTest(schema, modules);
    const roomId = await t.mutation(api.rooms.create, { organizerName: "Ana", adminToken: token });
    await t.mutation(api.rooms.create, { organizerName: "Bia", adminToken: otherToken });
    for (const adminToken of [undefined, "", "Ana", "c".repeat(64), otherToken]) {
      expect(await t.query(api.rooms.getAdmin, { roomId, ...(adminToken === undefined ? {} : { adminToken }) })).toEqual({ status: "denied" });
    }
    const room = await t.run((ctx) => ctx.db.get(roomId));
    await expect(requireRoomAdmin(room!, otherToken)).rejects.toThrow("ACCESS_DENIED");
  });

  it("trata identificadores inválidos e salas removidas como inexistentes", async () => {
    const t = convexTest(schema, modules);
    const roomId = await t.mutation(api.rooms.create, { organizerName: "Ana", adminToken: token });
    await t.run((ctx) => ctx.db.delete(roomId));
    for (const id of [roomId, "sala-inexistente", ""]) {
      expect(await t.query(api.rooms.getPublic, { roomId: id })).toBeNull();
      expect(await t.query(api.rooms.getAdmin, { roomId: id, adminToken: token })).toEqual({ status: "not_found" });
    }
  });

  it("cria salas distintas mesmo quando os organizadores têm o mesmo nome", async () => {
    const t = convexTest(schema, modules);
    const one = await t.mutation(api.rooms.create, { organizerName: "Ana", adminToken: token });
    const two = await t.mutation(api.rooms.create, { organizerName: "Ana", adminToken: otherToken });
    expect(one).not.toBe(two);
  });
});
