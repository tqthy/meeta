"use client";

import React, { useState } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";

const JitsiVideo = () => {
  // const domain = "meet.jit.si";
  const domain = "localhost:8443"; // For self-hosted Jitsi instance
  const [room, setRoom] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [start, setStart] = useState(false);

  return (
    <div>
      {!start && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStart(true);
          }}
        >
          <input
            placeholder="Room Name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            required
          />
          <input
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Join / Create Room</button>
        </form>
      )}
      {start && (
        <JitsiMeeting
          domain={domain}
          roomName={room}
          userInfo={{
            displayName: displayName,
            email: email
          }}
          getIFrameRef={(node) => (node.style.height = "700px")}
          onApiReady={(api) => {
            console.log("Jitsi API Ready", api);
            // Optional: register event listeners, etc.
          }}
        />
      )}
    </div>
  );
};

export default JitsiVideo;
