// import { randomID } from "@/lib/utils";
// import { useClerk } from "@clerk/nextjs";
// import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

// export function getUrlParams(url = window.location.href) {
//     let urlStr = url.split("?")[1];
//     return new URLSearchParams(urlStr);
// }

// export default function VideoUIKit() {
//     const roomID = getUrlParams().get("roomID") || randomID(5);
//     const { user } = useClerk();

//     let myMeeting = (element: HTMLDivElement) => {
//         const initMeeting = async () => {
//             const res = await fetch(`/api/zegocloud?userID=${user?.id}`);
//             const { token, appID } = await res.json();

//             const username = user?.fullName || user?.emailAddresses[0].emailAddress.split("@")[0];

//             const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(appID, token, roomID, user?.id!, username);

//             const zp = ZegoUIKitPrebuilt.create(kitToken);
//             zp.joinRoom({
//                 container: element,
//                 sharedLinks: [
//                     {
//                         name: "Personal link",
//                         url:
//                             window.location.protocol +
//                             "//" +
//                             window.location.host +
//                             window.location.pathname +
//                             "?roomID=" +
//                             roomID,
//                     },
//                 ],
//                 scenario: {
//                     mode: ZegoUIKitPrebuilt.GroupCall, // To implement 1-on-1 calls, modify the parameter here to [ZegoUIKitPrebuilt.OneONoneCall].
//                 },
//             });
//         };
//         initMeeting();
//     };

//     return <div className='myCallContainer' ref={myMeeting} style={{ width: "100vw", height: "100vh" }}></div>;
// }


"use client";

import { randomID } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/nextjs";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useEffect, useRef } from "react";

export function getUrlParams(url = window.location.href) {
    const urlStr = url.split("?")[1];

    return new URLSearchParams(urlStr);
}

export default function VideoUIKit() {
    const containerRef = useRef<HTMLDivElement>(null);
    const zegoRef = useRef<ZegoUIKitPrebuilt | null>(null);
    const initializedRef = useRef(false);

    const { user, isLoaded } = useUser();

    const roomID =
        getUrlParams().get("roomID") || randomID(5);

    useEffect(() => {
        // Wait until Clerk is completely loaded
        if (!isLoaded) {
            return;
        }

        // User must exist
        if (!user?.id) {
            console.error("ZEGOCLOUD: Clerk user is not available");
            return;
        }

        // Container must exist
        if (!containerRef.current) {
            return;
        }

        // Prevent duplicate initialization
        if (initializedRef.current) {
            return;
        }

        initializedRef.current = true;

        const initMeeting = async () => {
            try {
                console.log("Initializing ZEGOCLOUD...");
                console.log("User ID:", user.id);
                console.log("Room ID:", roomID);

                const res = await fetch(
                    `/api/zegocloud?userID=${encodeURIComponent(user.id)}`
                );

                if (!res.ok) {
                    const error = await res.json().catch(() => null);

                    throw new Error(
                        error?.error ||
                        "Failed to generate ZEGOCLOUD token"
                    );
                }

                const data = await res.json();

                const { token, appID } = data;

                if (!token || !appID) {
                    throw new Error(
                        "ZEGOCLOUD token or AppID is missing"
                    );
                }

                const username =
                    user.fullName ||
                    user.emailAddresses[0]?.emailAddress.split("@")[0] ||
                    "User";

                const kitToken =
                    ZegoUIKitPrebuilt.generateKitTokenForProduction(
                        appID,
                        token,
                        roomID,
                        user.id,
                        username
                    );

                const zp = ZegoUIKitPrebuilt.create(kitToken);

                zegoRef.current = zp;

                zp.joinRoom({
                    container: containerRef.current!,

                    sharedLinks: [
                        {
                            name: "Personal link",
                            url:
                                window.location.origin +
                                window.location.pathname +
                                "?roomID=" +
                                roomID,
                        },
                    ],

                    scenario: {
                        mode: ZegoUIKitPrebuilt.GroupCall,
                    },

                    showPreJoinView: true,

                    turnOnCameraWhenJoining: true,

                    turnOnMicrophoneWhenJoining: true,

                    showScreenSharingButton: true,
                });

                console.log(
                    "ZEGOCLOUD joined successfully"
                );
            } catch (error) {
                console.error(
                    "ZEGOCLOUD initialization failed:",
                    error
                );

                initializedRef.current = false;
            }
        };

        initMeeting();

        return () => {
            if (zegoRef.current) {
                zegoRef.current.destroy();
                zegoRef.current = null;
            }

            initializedRef.current = false;
        };
    }, [isLoaded, user, roomID]);

    return (
        <div
            ref={containerRef}
            className="myCallContainer"
            style={{
                width: "100vw",
                height: "100vh",
            }}
        />
    );
}

