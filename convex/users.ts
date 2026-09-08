import { v } from "convex/values";
import { mutation, } from "./_generated/server";

export const syncUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        clerkId: v.string(),
        image: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
            .first();

        if (existingUser) return;

        return await ctx.db.insert("users", {
            ...args,
            role: "user",
            isOnline: true
        });
    },
});
export const setUserOffline = mutation({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, { clerkId }) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) =>
                q.eq("clerkId", clerkId)
            )
            .unique();

        if (!user) {
            console.log("User not found:", clerkId);
            return;
        }

        await ctx.db.patch(user._id, {
            isOnline: false,
        });
    },
});

export const setUserOnline = mutation({
    args: {
        clerkId: v.string(),
    },

    handler: async (ctx, { clerkId }) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) =>
                q.eq("clerkId", clerkId)
            )
            .unique();

        if (!user) {
            console.log("User not found:", clerkId);
            return;
        }

        await ctx.db.patch(user._id, {
            isOnline: true,
        });
    },
});
