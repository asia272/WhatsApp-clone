import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";


export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.string(),
        image: v.optional(v.string()),
        isOnline: v.boolean(),

        admin: v.boolean(),
        clerkId: v.string(),
    }).index("by_clerkId", ["clerkId"]),

    conversations: defineTable({
        participants: v.array(v.id("users")),
        isGroup: v.boolean(),
        groupName: v.optional(v.string()),
        groupImage: v.optional(v.string()),
        admin: v.optional(v.id("users")),
    }),

    messages: defineTable({
        conversation: v.id("conversations"),
        sender: v.string(),
        content: v.string(),
        messageType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
    }).index("by_conversation", ["conversation"]),
})