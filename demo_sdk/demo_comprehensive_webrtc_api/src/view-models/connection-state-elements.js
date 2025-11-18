import connectionStateTracker from "../models/trackers/connection-state-tracker";

function initializeConnectionStateDisplay() {
  const displayElement = document.getElementById("connectionStateDisplay");
  connectionStateTracker.setOnStateChange((states) => {
    if (!displayElement) {
      return;
    }

    if (states.size === 0) {
      displayElement.innerHTML = "<p>No active connections</p>";
      return;
    }

    let html = "";
    states.forEach((state, peerId) => {
      html += `
                <div class="state-item">
                    <strong>Peer: ${peerId.substring(0, 8)}...</strong><br>
                    Connection: <span class="state-${state.connectionState}">${
        state.connectionState
      }</span><br>
                    ICE Connection: <span class="state-${
                      state.iceConnectionState
                    }">${state.iceConnectionState}</span><br>
                    ICE Gathering: <span class="state-${
                      state.iceGatheringState
                    }">${state.iceGatheringState}</span><br>
                    Signaling: <span class="state-${state.signalingState}">${
        state.signalingState
      }</span>
                </div>
            `;
    });

    displayElement.innerHTML = html;
  });
}

initializeConnectionStateDisplay();
