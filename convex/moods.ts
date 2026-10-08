import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireParticipant } from "./lib/roomAccess";

export const submit = mutation({
  args: { roomId: v.id("rooms"), participantToken: v.string(), value: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Sala não encontrada.");
    if (room.status !== "active" || !room.currentCollectionId) {
      throw new ConvexError("A coleta de mood ainda não está ativa.");
    }
    const participant = await requireParticipant(ctx, room._id, args.participantToken);
    if (!Number.isInteger(args.value) || args.value < 0 || args.value > 5) {
      throw new ConvexError("Escolha um estado entre 0 e 5.");
    }
    const existing = await ctx.db.query("moodResponses")
      .withIndex("by_collection_and_participant", (q) =>
        q.eq("collectionId", room.currentCollectionId!).eq("participantId", participant._id),
      )
      .unique();
    if (existing) throw new ConvexError("Você já respondeu nesta coleta.");
    await ctx.db.insert("moodResponses", {
      roomId: room._id,
      collectionId: room.currentCollectionId,
      participantId: participant._id,
      value: args.value,
      submittedAt: Date.now(),
    });
    return null;
  },
});
