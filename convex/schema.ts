import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  counters: defineTable({ value: v.number() }),
  rooms: defineTable({
    organizerName: v.string(),
    adminTokenHash: v.string(),
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("ended")),
    moodIntervalMs: v.number(),
    collectionVersion: v.number(),
    currentCollectionNumber: v.number(),
    currentCollectionId: v.optional(v.id("moodCollections")),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  }).index("by_admin_token_hash", ["adminTokenHash"]),
  participants: defineTable({
    roomId: v.id("rooms"),
    name: v.string(),
    normalizedName: v.string(),
    tokenHash: v.string(),
    joinedAt: v.number(),
  })
    .index("by_room_and_name", ["roomId", "normalizedName"])
    .index("by_room", ["roomId"])
    .index("by_room_and_token_hash", ["roomId", "tokenHash"]),
  questions: defineTable({
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    authorName: v.string(),
    body: v.string(),
    status: v.union(v.literal("open"), v.literal("answered")),
    voteCount: v.number(),
    createdAt: v.number(),
    answeredAt: v.optional(v.number()),
  }).index("by_room", ["roomId"]),
  votes: defineTable({
    roomId: v.id("rooms"),
    questionId: v.id("questions"),
    participantId: v.id("participants"),
    createdAt: v.number(),
  })
    .index("by_question_and_participant", ["questionId", "participantId"])
    .index("by_participant", ["participantId"]),
  moodCollections: defineTable({
    roomId: v.id("rooms"),
    number: v.number(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index("by_room_and_number", ["roomId", "number"]),
  moodResponses: defineTable({
    roomId: v.id("rooms"),
    collectionId: v.id("moodCollections"),
    participantId: v.id("participants"),
    value: v.number(),
    submittedAt: v.number(),
  })
    .index("by_collection_and_participant", ["collectionId", "participantId"])
    .index("by_room", ["roomId"]),
});
