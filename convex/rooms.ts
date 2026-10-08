import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { hashAdminToken, isAdminToken, requireRoomAdmin } from "./lib/roomAccess";

export const create = mutation({
  args: { organizerName: v.string(), adminToken: v.string() },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    const organizerName = args.organizerName.trim();
    if (!organizerName) throw new ConvexError("Informe seu nome para criar a sala.");
    if (!isAdminToken(args.adminToken)) throw new ConvexError("Chave de administração inválida.");

    const adminTokenHash = await hashAdminToken(args.adminToken);
    const existing = await ctx.db.query("rooms")
      .withIndex("by_admin_token_hash", (q) => q.eq("adminTokenHash", adminTokenHash))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("rooms", {
      organizerName,
      adminTokenHash,
      status: "waiting",
      moodIntervalMs: 60_000,
      collectionVersion: 0,
      currentCollectionNumber: 0,
    });
  },
});

export const join = mutation({
  args: { roomId: v.id("rooms"), name: v.string(), participantToken: v.string() },
  returns: v.id("participants"),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    if (room.status === "ended") throw new ConvexError("Esta sessão foi encerrada.");

    const name = args.name.trim();
    if (!name) throw new ConvexError("Informe seu nome para entrar na sala.");
    if (!isAdminToken(args.participantToken)) throw new ConvexError("Credencial de participação inválida.");
    const normalizedName = name.toLowerCase();
    const tokenHash = await hashAdminToken(args.participantToken);
    const browserIdentity = await ctx.db.query("participants")
      .withIndex("by_room_and_token_hash", (q) => q.eq("roomId", room._id).eq("tokenHash", tokenHash))
      .unique();
    if (browserIdentity) {
      if (browserIdentity.normalizedName === normalizedName) return browserIdentity._id;
      throw new ConvexError("Este navegador já participa da sala com outro nome.");
    }
    const existing = await ctx.db.query("participants")
      .withIndex("by_room_and_name", (q) => q.eq("roomId", room._id).eq("normalizedName", normalizedName))
      .unique();
    if (existing) {
      if (existing.tokenHash === tokenHash) return existing._id;
      throw new ConvexError("Esse nome já está em uso nesta sala.");
    }
    return await ctx.db.insert("participants", {
      roomId: room._id,
      name,
      normalizedName,
      tokenHash,
      joinedAt: Date.now(),
    });
  },
});

export const start = mutation({
  args: { roomId: v.id("rooms"), adminToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    await requireRoomAdmin(room, args.adminToken);
    if (room.status === "ended") throw new ConvexError("Esta sessão foi encerrada.");
    if (room.status === "active") return null;

    const now = Date.now();
    const collectionId = await ctx.db.insert("moodCollections", {
      roomId: room._id,
      number: 1,
      startedAt: now,
    });
    await ctx.db.patch(room._id, {
      status: "active",
      startedAt: now,
      currentCollectionNumber: 1,
      currentCollectionId: collectionId,
      collectionVersion: 1,
    });
    await ctx.scheduler.runAfter(room.moodIntervalMs, internal.collections.advance, {
      roomId: room._id,
      version: 1,
    });
    return null;
  },
});

export const end = mutation({
  args: { roomId: v.id("rooms"), adminToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    await requireRoomAdmin(room, args.adminToken);
    if (room.status === "ended") return null;
    const now = Date.now();
    if (room.currentCollectionId) await ctx.db.patch(room.currentCollectionId, { endedAt: now });
    await ctx.db.patch(room._id, { status: "ended", endedAt: now, collectionVersion: room.collectionVersion + 1 });
    return null;
  },
});

export const setMoodInterval = mutation({
  args: { roomId: v.id("rooms"), adminToken: v.string(), intervalMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    await requireRoomAdmin(room, args.adminToken);
    if (room.status === "ended") throw new ConvexError("Esta sessão foi encerrada.");
    if (!Number.isInteger(args.intervalMs) || args.intervalMs < 15_000 || args.intervalMs > 3_600_000) {
      throw new ConvexError("O intervalo deve estar entre 15 segundos e 60 minutos.");
    }
    const version = room.collectionVersion + 1;
    await ctx.db.patch(room._id, { moodIntervalMs: args.intervalMs, collectionVersion: version });
    if (room.status === "active") {
      await ctx.scheduler.runAfter(args.intervalMs, internal.collections.advance, { roomId: room._id, version });
    }
    return null;
  },
});

export const advanceMoodCollection = mutation({
  args: { roomId: v.id("rooms"), adminToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    await requireRoomAdmin(room, args.adminToken);
    if (room.status !== "active") throw new ConvexError("A sessão não está ativa.");
    const now = Date.now();
    if (room.currentCollectionId) await ctx.db.patch(room.currentCollectionId, { endedAt: now });
    const number = room.currentCollectionNumber + 1;
    const collectionId = await ctx.db.insert("moodCollections", { roomId: room._id, number, startedAt: now });
    const version = room.collectionVersion + 1;
    await ctx.db.patch(room._id, {
      currentCollectionNumber: number,
      currentCollectionId: collectionId,
      collectionVersion: version,
    });
    await ctx.scheduler.runAfter(room.moodIntervalMs, internal.collections.advance, { roomId: room._id, version });
    return null;
  },
});

export const getPublic = query({
  args: { roomId: v.string() },
  returns: v.union(v.null(), v.object({ _id: v.id("rooms"), status: v.string() })),
  handler: async (ctx, args) => {
    const roomId = ctx.db.normalizeId("rooms", args.roomId);
    const room = roomId ? await ctx.db.get(roomId) : null;
    return room ? { _id: room._id, status: room.status } : null;
  },
});

export const getAdmin = query({
  args: { roomId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.union(
    v.object({ status: v.literal("not_found") }),
    v.object({ status: v.literal("denied") }),
    v.object({
      status: v.literal("ok"),
      room: v.object({
        _id: v.id("rooms"), _creationTime: v.number(), organizerName: v.string(),
        status: v.string(), moodIntervalMs: v.number(), currentCollectionNumber: v.number(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const roomId = ctx.db.normalizeId("rooms", args.roomId);
    const room = roomId ? await ctx.db.get(roomId) : null;
    if (!room) return { status: "not_found" } as const;
    try {
      await requireRoomAdmin(room, args.adminToken);
    } catch (error) {
      if (error instanceof ConvexError && error.data === "ACCESS_DENIED") {
        return { status: "denied" } as const;
      }
      throw error;
    }
    return {
      status: "ok" as const,
      room: {
        _id: room._id,
        _creationTime: room._creationTime,
        organizerName: room.organizerName,
        status: room.status,
        moodIntervalMs: room.moodIntervalMs,
        currentCollectionNumber: room.currentCollectionNumber,
      },
    };
  },
});

export const getDashboard = query({
  args: { roomId: v.id("rooms"), adminToken: v.string() },
  returns: v.object({
    room: v.object({
      _id: v.id("rooms"), organizerName: v.string(), status: v.string(),
      moodIntervalMs: v.number(), currentCollectionNumber: v.number(),
    }),
    participants: v.array(v.object({
      _id: v.id("participants"), name: v.string(), lastMood: v.union(v.number(), v.null()),
      lastMoodAt: v.union(v.number(), v.null()),
    })),
    questions: v.array(v.object({
      _id: v.id("questions"), body: v.string(), authorName: v.string(), status: v.string(),
      voteCount: v.number(), createdAt: v.number(),
    })),
    collections: v.array(v.object({
      _id: v.id("moodCollections"), number: v.number(), startedAt: v.number(), endedAt: v.union(v.number(), v.null()),
      responseCount: v.number(), average: v.union(v.number(), v.null()),
      responses: v.array(v.object({ participantName: v.string(), value: v.number(), submittedAt: v.number() })),
    })),
  }),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    await requireRoomAdmin(room, args.adminToken);
    const [participants, questions, collections, responses] = await Promise.all([
      ctx.db.query("participants").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect(),
      ctx.db.query("questions").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect(),
      ctx.db.query("moodCollections").withIndex("by_room_and_number", (q) => q.eq("roomId", room._id)).collect(),
      ctx.db.query("moodResponses").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect(),
    ]);
    const participantById = new Map(participants.map((participant) => [participant._id, participant]));
    const collectionNumberById = new Map(collections.map((collection) => [collection._id, collection.number]));
    const lastMoodByParticipant = new Map<string, { value: number; submittedAt: number; collectionNumber: number }>();
    const responsesByCollection = new Map<string, typeof responses>();
    for (const response of responses) {
      const latest = lastMoodByParticipant.get(response.participantId);
      const collectionNumber = collectionNumberById.get(response.collectionId) ?? 0;
      if (!latest || collectionNumber > latest.collectionNumber
        || (collectionNumber === latest.collectionNumber && response.submittedAt >= latest.submittedAt)) {
        lastMoodByParticipant.set(response.participantId, { value: response.value, submittedAt: response.submittedAt, collectionNumber });
      }
      const list = responsesByCollection.get(response.collectionId) ?? [];
      list.push(response);
      responsesByCollection.set(response.collectionId, list);
    }
    return {
      room: {
        _id: room._id,
        organizerName: room.organizerName,
        status: room.status,
        moodIntervalMs: room.moodIntervalMs,
        currentCollectionNumber: room.currentCollectionNumber,
      },
      participants: participants.map((participant) => {
        const latest = lastMoodByParticipant.get(participant._id);
        return { _id: participant._id, name: participant.name, lastMood: latest?.value ?? null, lastMoodAt: latest?.submittedAt ?? null };
      }),
      questions: questions
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(({ _id, body, authorName, status, voteCount, createdAt }) => ({ _id, body, authorName, status, voteCount, createdAt })),
      collections: collections
        .sort((a, b) => a.number - b.number)
        .map((collection) => {
          const collectionResponses = responsesByCollection.get(collection._id) ?? [];
          const sum = collectionResponses.reduce((total, response) => total + response.value, 0);
          return {
            _id: collection._id,
            number: collection.number,
            startedAt: collection.startedAt,
            endedAt: collection.endedAt ?? null,
            responseCount: collectionResponses.length,
            average: collectionResponses.length ? sum / collectionResponses.length : null,
            responses: collectionResponses.map((response) => ({
              participantName: participantById.get(response.participantId)?.name ?? "Participante",
              value: response.value,
              submittedAt: response.submittedAt,
            })),
          };
        }),
    };
  },
});
