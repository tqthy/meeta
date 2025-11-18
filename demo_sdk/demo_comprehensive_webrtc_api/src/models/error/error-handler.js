/**
 * Error Handler - Handles WebRTC errors and displays user-friendly messages
 * Monitors RTCError and RTCErrorEvent
 */

class ErrorHandler {
  constructor() {
    this.errorTimeout = null;
    this.displayCallback = null;
    this.onClearCallback = null;
  }

  /**
   * Handle getUserMedia error
   * @param {DOMException} error - DOMException from getUserMedia
   */
  handleGetUserMediaError(error) {
    let message;

    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        message =
          "Camera/microphone access denied. Please allow access in your browser settings.";
        break;
      case "NotFoundError":
      case "DevicesNotFoundError":
        message = "No camera or microphone found. Please connect a device.";
        break;
      case "NotReadableError":
      case "TrackStartError":
        message =
          "Camera or microphone is already in use by another application.";
        break;
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        message = "Camera or microphone constraints cannot be satisfied.";
        break;
      case "TypeError":
        message = "Invalid constraints provided to getUserMedia.";
        break;
      default:
        message = `getUserMedia error: ${error.message || error.name}`;
    }
    this.displayError(message, "error");
    console.error("getUserMedia error:", error);
  }

  /**
   * Handle generic error
   * @param {Error|string} error - Error object or error message
   * @param {string} context - Context where error occurred
   */
  handleError(error, context = "") {
    let message;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else {
      message = "An unknown error occurred";
    }

    if (context) {
      message = `[${context}] ${message}`;
    }

    this.displayError(message, "error");
    console.error("Error:", error, "Context:", context);
  }

  /**
   * Setup error handlers for RTCPeerConnection
   * @param {RTCPeerConnection} pc - Peer connection to monitor
   * @param {string} peerId - Peer ID for context
   */
  setupPeerConnectionErrorHandlers(pc, peerId) {
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed") {
        this.handleError(
          `Connection failed with peer ${peerId}`,
          "peer-connection"
        );
      }
    });

    // Note: RTCErrorEvent is not widely supported yet, but we'll handle it if available
    if ("onrtcerror" in pc) {
      pc.addEventListener("rtcerror", (event) => {
        this.handleRTCError(event, `peer-connection-${peerId}`);
      });
    }
  }

  displayError(message, type = "error") {
    // Clear existing timeout
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.displayCallback(message, (type = "error"));

    // Auto-hide after 5 seconds
    this.errorTimeout = setTimeout(() => this.onClearCallback(), 5000);
  }

  clearError() {
    this.onClearCallback();
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
  }

  setOnDisplay(callback) {
    this.displayCallback = callback;
  }

  setOnClear(callback) {
    this.onClearCallback = callback;
  }
}

// Export singleton instance
const errorHandler = new ErrorHandler();
export default errorHandler;
