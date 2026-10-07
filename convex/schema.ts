import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  counters: defineTable({ value: v.number() }),
  rooms: defineTable({
    organizerName: v.string(),
    adminTokenHash: v.string(),
  }).index("by_admin_token_hash", ["adminTokenHash"]),
});
