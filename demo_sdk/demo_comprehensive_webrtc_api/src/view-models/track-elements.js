import trackEvents from "../models/media/track-event.js";

function initializeTrackIndicator() {
  trackEvents.setOnTrackStateChange((peerId, track, state) => {
    const videoElement = document.querySelector(`#video-${peerId} video`);
    if (!videoElement) {
      return;
    }

    // Add visual indicator
    let indicator =
      videoElement.parentElement.querySelector(".track-indicator");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "track-indicator";
      indicator.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                padding: 5px 10px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border-radius: 5px;
                font-size: 11px;
                z-index: 10;
            `;
      videoElement.parentElement.appendChild(indicator);
    }

    const stateColors = {
      active: "#4caf50",
      muted: "#ff9800",
      ended: "#f44336"
    };

    const stateText = {
      active: `${track.kind} active`,
      muted: `${track.kind} muted`,
      ended: `${track.kind} ended`
    };

    indicator.textContent = stateText[state];
    indicator.style.background = stateColors[state] || "rgba(0, 0, 0, 0.7)";
  });
}

initializeTrackIndicator();
