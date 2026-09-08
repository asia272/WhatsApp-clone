import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
    path: "/clerk-webhook",
    method: "POST",

    handler: httpAction(async (ctx, request) => {
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

        if (!webhookSecret) {
            throw new Error(
                "Missing CLERK_WEBHOOK_SECRET environment variable"
            );
        }

        // Get Svix webhook headers
        const svixId = request.headers.get("svix-id");
        const svixTimestamp = request.headers.get("svix-timestamp");
        const svixSignature = request.headers.get("svix-signature");

        if (!svixId || !svixTimestamp || !svixSignature) {
            return new Response("Missing Svix headers", {
                status: 400,
            });
        }

        // IMPORTANT:
        // Read the original request body as text.
        // Svix signature verification requires the raw body.
        const body = await request.text();

        // Create Svix webhook verifier
        const wh = new Webhook(webhookSecret);

        // Verify webhook signature
        try {
            wh.verify(body, {
                "svix-id": svixId,
                "svix-timestamp": svixTimestamp,
                "svix-signature": svixSignature,
            });
        } catch (error) {
            console.error("Error verifying Clerk webhook:", error);

            return new Response("Invalid webhook signature", {
                status: 400,
            });
        }

        // Parse webhook body AFTER signature verification
        const evt = JSON.parse(body) as {
            type: string;
            data: {
                id: string;

                // Used by session.ended
                user_id?: string;

                // Used by user.created
                email_addresses?: {
                    email_address: string;
                }[];

                first_name?: string | null;
                last_name?: string | null;
                image_url?: string;
            };
        }; console.log("CLERK WEBHOOK EVENT:", JSON.stringify(evt, null, 2));

        // --------------------------------------------------
        // USER CREATED
        // --------------------------------------------------
        if (evt.type === "user.created") {
            const {
                id,
                email_addresses,
                first_name,
                last_name,
                image_url,
            } = evt.data;

            const email = email_addresses?.[0]?.email_address;

            if (!email) {
                return new Response("User email is missing", {
                    status: 400,
                });
            }

            const name = `${first_name ?? ""} ${last_name ?? ""}`.trim();

            try {
                await ctx.runMutation(api.users.syncUser, {
                    clerkId: id,
                    email,
                    name,
                    image: image_url,
                });
            } catch (error) {
                console.error("Error creating user:", error);

                return new Response("Error creating user", {
                    status: 500,
                });
            }
        }
        // SSSION CREATED
        if (evt.type === "session.created") {
            const clerkId = evt.data.user_id;

            if (!clerkId) {
                return new Response("User ID missing", {
                    status: 400,
                });
            }

            await ctx.runMutation(api.users.setUserOnline, {
                clerkId,
            });
        }
        // --------------------------------------------------
        // SESSION ENDED
        // --------------------------------------------------
        if (
            evt.type === "session.ended" ||
            evt.type === "session.removed" ||
            evt.type === "session.revoked"
        ) {
            const clerkId = evt.data.user_id;

            if (!clerkId) {
                console.error(
                    "Clerk user ID is missing from session.ended webhook"
                );

                return new Response("User ID missing", {
                    status: 400,
                });
            }

            try {
                await ctx.runMutation(api.users.setUserOffline, {
                    clerkId,
                });
            } catch (error) {
                console.error(
                    "Error setting user offline:",
                    error
                );

                return new Response("Error setting user offline", {
                    status: 500,
                });
            }
        }

        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------
        return new Response("Webhook processed successfully", {
            status: 200,
        });
    }),
});

export default http;