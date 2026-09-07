import { AuthConfig } from "convex/server";

export default {
    providers: [
        {
            domain: "https://hip-locust-7224.clerk.accounts.dev",
            applicationID: "convex",
        },
    ]
} satisfies AuthConfig;
