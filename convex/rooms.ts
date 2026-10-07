import { ConvexError, v } from "convex/values";
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
    return await ctx.db.insert("rooms", { organizerName, adminTokenHash });
  },
});

export const getPublic = query({
  args: { roomId: v.string() },
  returns: v.union(v.null(), v.object({ _id: v.id("rooms") })),
  handler: async (ctx, args) => {
    const roomId = ctx.db.normalizeId("rooms", args.roomId);
    const room = roomId ? await ctx.db.get(roomId) : null;
    return room ? { _id: room._id } : null;
  },
});

export const getAdmin = query({
  args: { roomId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.union(
    v.object({ status: v.literal("not_found") }),
    v.object({ status: v.literal("denied") }),
    v.object({
      status: v.literal("ok"),
      room: v.object({ _id: v.id("rooms"), _creationTime: v.number(), organizerName: v.string() }),
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
      room: { _id: room._id, _creationTime: room._creationTime, organizerName: room.organizerName },
    };
  },
});
