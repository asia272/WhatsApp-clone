import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";


export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.string(),
        image: v.optional(v.string()),
        isOnline: v.boolean(),

        role: v.union(v.literal("user"), v.literal("admin")),
        clerkId: v.string(),
    }).index("by_clerkId", ["clerkId"]),
})