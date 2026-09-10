import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

export const createMessage = mutation({
    args: {
        conversation: v.id("conversations"),
        content: v.string(),
        messageType: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("video")
        ),
    },

    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) =>
                q.eq("clerkId", identity.subject)
            )
            .unique();

        if (!user) {
            throw new ConvexError("User not found");
        }

        const conversation = await ctx.db.get(args.conversation);

        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        const isParticipant = conversation.participants.includes(user._id);

        if (!isParticipant) {
            throw new ConvexError(
                "You are not a participant of this conversation"
            );
        }

        if (args.messageType === "text" && !args.content.trim()) {
            throw new ConvexError("Message cannot be empty");
        }

        const messageId = await ctx.db.insert("messages", {
            conversation: args.conversation,
            sender: user._id.toString(),
            content: args.content.trim(),
            messageType: args.messageType,
        });

        return messageId;
    },
});