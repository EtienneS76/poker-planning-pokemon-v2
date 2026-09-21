import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({}),

  sizings: defineTable({
    createdBy: v.id("users"),
    state: v.union(
      v.literal("hidden"),
      v.literal("revealed"),
      v.literal("countdown"),
    ),
  }),

  units: defineTable({
    userId: v.id("users"),
    number: v.number(),
    lvl: v.number(),
    shiny: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_number", ["userId", "number"])
    .index("by_userId_and_number_and_shiny", ["userId", "number", "shiny"]),

  participants: defineTable({
    sizingId: v.id("sizings"),
    userId: v.id("users"),
    unit: v.id("units"),
    vote: v.nullable(v.string()),
    isSpectator: v.optional(v.boolean()),
  })
    .index("by_sizingId", ["sizingId"])
    .index("by_sizingId_and_userId", ["sizingId", "userId"]),

  pokeballStocks: defineTable({
    sizingId: v.id("sizings"),
    userId: v.id("users"),
    count: v.number(),
    lastTick: v.number(),
  }).index("by_sizingId_and_userId", ["sizingId", "userId"]),

  captureAttempts: defineTable({
    sizingId: v.id("sizings"),
    pokemonNumber: v.number(),
    shiny: v.optional(v.boolean()),
    failureCount: v.number(),
  })
    .index("by_sizingId_and_pokemonNumber", ["sizingId", "pokemonNumber"])
    .index("by_sizingId_and_pokemonNumber_and_shiny", [
      "sizingId",
      "pokemonNumber",
      "shiny",
    ]),
});
