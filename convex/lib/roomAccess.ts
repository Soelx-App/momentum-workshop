import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export function isAdminToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

export async function hashAdminToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Every future administrative query or mutation must enforce this check.
export async function requireRoomAdmin(room: Doc<"rooms">, token?: string) {
  if (!token || !isAdminToken(token) || (await hashAdminToken(token)) !== room.adminTokenHash) {
    throw new ConvexError("ACCESS_DENIED");
  }
  return room;
}

export async function requireParticipant(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  roomId: Doc<"rooms">["_id"],
  token?: string,
) {
  if (!token || !isAdminToken(token)) throw new ConvexError("ACCESS_DENIED");
  const tokenHash = await hashAdminToken(token);
  const participant = await ctx.db.query("participants")
    .withIndex("by_room_and_token_hash", (q) => q.eq("roomId", roomId).eq("tokenHash", tokenHash))
    .unique();
  if (!participant) throw new ConvexError("ACCESS_DENIED");
  return participant;
}
