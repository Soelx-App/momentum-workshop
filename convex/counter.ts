import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const counter = await ctx.db.query("counters").first();
    return counter?.value ?? 0;
  },
});

export const increment = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const counter = await ctx.db.query("counters").first();
    if (counter) {
      await ctx.db.patch(counter._id, { value: counter.value + 1 });
    } else {
      await ctx.db.insert("counters", { value: 1 });
    }
    return null;
  },
});
