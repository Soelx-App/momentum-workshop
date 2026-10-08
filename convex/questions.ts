import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireParticipant, requireRoomAdmin } from "./lib/roomAccess";

export const ask = mutation({
  args: { roomId: v.id("rooms"), participantToken: v.string(), body: v.string() },
  returns: v.id("questions"),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    if (room.status === "ended") throw new ConvexError("Esta sessão foi encerrada.");
    const participant = await requireParticipant(ctx, room._id, args.participantToken);
    const body = args.body.trim();
    if (!body) throw new ConvexError("Escreva sua pergunta antes de enviar.");
    return await ctx.db.insert("questions", {
      roomId: room._id,
      participantId: participant._id,
      authorName: participant.name,
      body,
      status: "open",
      voteCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const vote = mutation({
  args: { roomId: v.id("rooms"), participantToken: v.string(), questionId: v.id("questions") },
  returns: v.object({ voted: v.boolean() }),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    if (room.status === "ended") throw new ConvexError("Esta sessão foi encerrada.");
    const participant = await requireParticipant(ctx, room._id, args.participantToken);
    const question = await ctx.db.get(args.questionId);
    if (!question || question.roomId !== room._id) throw new ConvexError("Pergunta não encontrada.");
    if (question.participantId === participant._id) throw new ConvexError("Você não pode votar na própria pergunta.");
    if (question.status === "answered") throw new ConvexError("A pergunta já foi respondida.");

    const existing = await ctx.db.query("votes")
      .withIndex("by_question_and_participant", (q) => q.eq("questionId", question._id).eq("participantId", participant._id))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(question._id, { voteCount: question.voteCount - 1 });
      return { voted: false };
    }
    await ctx.db.insert("votes", {
      roomId: room._id,
      questionId: question._id,
      participantId: participant._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(question._id, { voteCount: question.voteCount + 1 });
    return { voted: true };
  },
});

export const markAnswered = mutation({
  args: { roomId: v.id("rooms"), adminToken: v.string(), questionId: v.id("questions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    await requireRoomAdmin(room, args.adminToken);
    if (room.status === "ended") throw new ConvexError("Esta sessão foi encerrada.");
    const question = await ctx.db.get(args.questionId);
    if (!question || question.roomId !== room._id) throw new ConvexError("Pergunta não encontrada.");
    if (question.status === "answered") return null;
    await ctx.db.patch(question._id, { status: "answered", answeredAt: Date.now() });
    return null;
  },
});

export const forParticipant = query({
  args: { roomId: v.id("rooms"), participantToken: v.string() },
  returns: v.object({
    status: v.string(),
    participantName: v.string(),
    currentCollectionNumber: v.number(),
    currentMood: v.union(v.number(), v.null()),
    questions: v.array(v.object({
      _id: v.id("questions"), body: v.string(), authorName: v.string(), status: v.string(),
      voteCount: v.number(), createdAt: v.number(), hasVoted: v.boolean(), isMine: v.boolean(),
    })),
  }),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    const participant = await requireParticipant(ctx, room._id, args.participantToken);
    const questions = await ctx.db.query("questions")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const votes = await ctx.db.query("votes")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();
    const currentMoodResponse = room.currentCollectionId
      ? await ctx.db.query("moodResponses")
        .withIndex("by_collection_and_participant", (q) =>
          q.eq("collectionId", room.currentCollectionId!).eq("participantId", participant._id),
        )
        .unique()
      : null;
    const votedQuestionIds = new Set(votes.map((vote) => vote.questionId));
    return {
      status: room.status,
      participantName: participant.name,
      currentCollectionNumber: room.currentCollectionNumber,
      currentMood: currentMoodResponse?.value ?? null,
      questions: questions
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((question) => ({
          _id: question._id,
          body: question.body,
          authorName: question.authorName,
          status: question.status,
          voteCount: question.voteCount,
          createdAt: question.createdAt,
          hasVoted: votedQuestionIds.has(question._id),
          isMine: question.participantId === participant._id,
        })),
    };
  },
});

export const forOrganizer = query({
  args: { roomId: v.id("rooms"), adminToken: v.string() },
  returns: v.object({
    roomStatus: v.string(),
    questions: v.array(v.object({
      _id: v.id("questions"), body: v.string(), authorName: v.string(), status: v.string(),
      voteCount: v.number(), createdAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    await requireRoomAdmin(room, args.adminToken);
    const questions = await ctx.db.query("questions")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    return {
      roomStatus: room.status,
      questions: questions
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(({ _id, body, authorName, status, voteCount, createdAt }) => ({
          _id, body, authorName, status, voteCount, createdAt,
        })),
    };
  },
});
