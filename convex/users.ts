import { ConvexError, v } from "convex/values";
import { mutation, query, } from "./_generated/server";

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
            admin: false,
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

// -------------------------
// GET CURRENT USER
// -------------------------
export const getMe = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) =>
                q.eq("clerkId", identity.subject)
            )
            .unique();

        return user;
    },
});

// -------------------------
// GET ALL USERS
// -------------------------
export const getAllUsers = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return [];
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) =>
                q.eq("clerkId", identity.subject)
            )
            .unique();

        if (!currentUser) {
            return [];
        }

        const users = await ctx.db
            .query("users")
            .collect();

        // Don't return the currently logged-in user
        return users.filter(
            (user) => user.clerkId !== identity.subject
        );
    },
});
export const updateUserProfile = mutation({
    args: {
        clerkId: v.string(),
        name: v.string(),
        image: v.optional(v.string()),
    },

    handler: async (ctx, { clerkId, name, image }) => {
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
            name,
            image,
        });

        console.log(`Updated profile for user: ${clerkId}`);
    },
});
export const getGroupMembers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const conversation = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("_id"), args.conversationId))
            .first();
        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        const users = await ctx.db.query("users").collect();
        const groupMembers = users.filter((user) => conversation.participants.includes(user._id));

        return groupMembers;
    },
});