import type { Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const TICK_MS = 3 * 60 * 1000; // 1 pokéball toutes les 3 minutes
const MAX_STOCK = 3;
const INITIAL_STOCK = 1; // pokéball offerte à l'arrivée dans la partie
const BASE_CHANCE = 10; // %
const CHANCE_STEP = 5; // % par échec sur le même pokémon
const SHINY_BASE_CHANCE = 1; // % : un shiny est bien plus dur à capturer
const SHINY_CHANCE_STEP = 1; // % par échec sur le même pokémon shiny

const getChance = (failureCount: number, shiny: boolean) =>
  shiny
    ? Math.min(100, SHINY_BASE_CHANCE + failureCount * SHINY_CHANCE_STEP)
    : Math.min(100, BASE_CHANCE + failureCount * CHANCE_STEP);

export const getStock = query({
  args: { sizingId: v.string(), userId: v.string() },
  handler: async (ctx, { sizingId, userId }) => {
    const stock = await ctx.db
      .query("pokeballStocks")
      .withIndex("by_sizingId_and_userId", (q) =>
        q
          .eq("sizingId", sizingId as Id<"sizings">)
          .eq("userId", userId as Id<"users">),
      )
      .unique();

    if (!stock) {
      return {
        count: INITIAL_STOCK,
        maxCount: MAX_STOCK,
        nextTickAt: Date.now() + TICK_MS,
      };
    }

    return {
      count: stock.count,
      maxCount: MAX_STOCK,
      // Pas de compte à rebours quand le stock est plein.
      nextTickAt:
        stock.count >= MAX_STOCK ? null : stock.lastTick + TICK_MS,
    };
  },
});

// À appeler périodiquement (côté client) pour faire avancer le stock de pokéballs
// si au moins 2 participants sont présents dans la partie.
export const tick = mutation({
  args: {
    sizingId: v.id("sizings"),
    userId: v.id("users"),
    eligibleParticipantCount: v.number(),
  },
  handler: async (ctx, { sizingId, userId, eligibleParticipantCount }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("pokeballStocks")
      .withIndex("by_sizingId_and_userId", (q) =>
        q.eq("sizingId", sizingId).eq("userId", userId),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("pokeballStocks", {
        sizingId,
        userId,
        count: INITIAL_STOCK,
        lastTick: now,
      });
      return;
    }

    // L'accumulation ne démarre qu'à partir de 2 joueurs présents.
    if (eligibleParticipantCount < 2) {
      await ctx.db.patch(existing._id, { lastTick: now });
      return;
    }

    if (existing.count >= MAX_STOCK) {
      // On garde le "lastTick" à jour pour ne pas accumuler un backlog de ticks
      // une fois le stock à nouveau consommé.
      await ctx.db.patch(existing._id, { lastTick: now });
      return;
    }

    const elapsedTicks = Math.floor((now - existing.lastTick) / TICK_MS);
    if (elapsedTicks <= 0) return;

    const newCount = Math.min(MAX_STOCK, existing.count + elapsedTicks);
    await ctx.db.patch(existing._id, {
      count: newCount,
      lastTick: existing.lastTick + elapsedTicks * TICK_MS,
    });
  },
});

export const getCaptureChance = query({
  args: {
    sizingId: v.id("sizings"),
    pokemonNumber: v.number(),
    shiny: v.optional(v.boolean()),
  },
  handler: async (ctx, { sizingId, pokemonNumber, shiny }) => {
    const attempt = await ctx.db
      .query("captureAttempts")
      .withIndex("by_sizingId_and_pokemonNumber_and_shiny", (q) =>
        q
          .eq("sizingId", sizingId)
          .eq("pokemonNumber", pokemonNumber)
          .eq("shiny", shiny === true),
      )
      .first();

    const failureCount = attempt?.failureCount ?? 0;
    return getChance(failureCount, shiny === true);
  },
});

export const attemptCapture = mutation({
  args: {
    sizingId: v.id("sizings"),
    userId: v.id("users"),
    targetUnitId: v.id("units"),
  },
  handler: async (ctx, { sizingId, userId, targetUnitId }) => {
    const targetUnit = await ctx.db.get(targetUnitId);
    if (!targetUnit) throw new Error("Pokémon introuvable");

    // Déjà dans le pokédex ? Une version shiny et une version normale du même
    // Pokémon sont considérées comme deux entrées distinctes.
    const alreadyOwned = await ctx.db
      .query("units")
      .withIndex("by_userId_and_number_and_shiny", (q) =>
        q
          .eq("userId", userId)
          .eq("number", targetUnit.number)
          .eq("shiny", targetUnit.shiny),
      )
      .first();

    if (alreadyOwned) {
      return { result: "already-owned" as const };
    }

    const stock = await ctx.db
      .query("pokeballStocks")
      .withIndex("by_sizingId_and_userId", (q) =>
        q.eq("sizingId", sizingId).eq("userId", userId),
      )
      .unique();

    if (!stock) {
      // Le stock n'a pas encore été matérialisé : on consomme la pokéball offerte.
      await ctx.db.insert("pokeballStocks", {
        sizingId,
        userId,
        count: INITIAL_STOCK - 1,
        lastTick: Date.now(),
      });
    } else if (stock.count <= 0) {
      return { result: "no-pokeball" as const };
    } else {
      await ctx.db.patch(stock._id, { count: stock.count - 1 });
    }

    const attempt = await ctx.db
      .query("captureAttempts")
      .withIndex("by_sizingId_and_pokemonNumber_and_shiny", (q) =>
        q
          .eq("sizingId", sizingId)
          .eq("pokemonNumber", targetUnit.number)
          .eq("shiny", targetUnit.shiny),
      )
      .first();

    const failureCount = attempt?.failureCount ?? 0;
    const chance = getChance(failureCount, targetUnit.shiny);
    const success = Math.random() * 100 < chance;

    if (success) {
      if (attempt) {
        await ctx.db.patch(attempt._id, { failureCount: 0 });
      }
      const newUnitId = await ctx.db.insert("units", {
        userId,
        number: targetUnit.number,
        lvl: targetUnit.lvl,
        shiny: targetUnit.shiny,
      });
      return { result: "success" as const, chance, unitId: newUnitId };
    } else {
      if (attempt) {
        await ctx.db.patch(attempt._id, { failureCount: failureCount + 1 });
      } else {
        await ctx.db.insert("captureAttempts", {
          sizingId,
          pokemonNumber: targetUnit.number,
          shiny: targetUnit.shiny,
          failureCount: 1,
        });
      }
      return { result: "failure" as const, chance };
    }
  },
});
