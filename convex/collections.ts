import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const advance = internalMutation({
  args: { roomId: v.id("rooms"), version: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "active" || room.collectionVersion !== args.version) return null;

    const now = Date.now();
    if (room.currentCollectionId) {
      await ctx.db.patch(room.currentCollectionId, { endedAt: now });
    }
    const number = room.currentCollectionNumber + 1;
    const collectionId = await ctx.db.insert("moodCollections", {
      roomId: room._id,
      number,
      startedAt: now,
    });
    const nextVersion = args.version + 1;
    await ctx.db.patch(room._id, {
      currentCollectionNumber: number,
      currentCollectionId: collectionId,
      collectionVersion: nextVersion,
    });
    await ctx.scheduler.runAfter(
      room.moodIntervalMs,
      internal.collections.advance,
      { roomId: room._id, version: nextVersion },
    );
    return null;
  },
});
