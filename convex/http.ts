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

        const svixId = request.headers.get("svix-id");
        const svixTimestamp = request.headers.get("svix-timestamp");
        const svixSignature = request.headers.get("svix-signature");

        if (!svixId || !svixTimestamp || !svixSignature) {
            return new Response("Missing Svix headers", {
                status: 400,
            });
        }

        // IMPORTANT:
        // Read the original body as text for Svix verification.
        const body = await request.text();

        const wh = new Webhook(webhookSecret);

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

        // Parse the body after verification
        const evt = JSON.parse(body) as {
            type: string;
            data: {
                id: string;
                email_addresses: {
                    email_address: string;
                }[];
                first_name: string | null;
                last_name: string | null;
                image_url: string;
            };
        };

        if (evt.type === "user.created") {
            const {
                id,
                email_addresses,
                first_name,
                last_name,
                image_url,
            } = evt.data;

            const email = email_addresses[0]?.email_address;

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

        return new Response("Webhook processed successfully", {
            status: 200,
        });
    }),
});

export default http;