class SignalingServer {
  constructor() {
    this.ws = null;
  }

  /**
   * Send signaling message
   */
  sendSignalingMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket not connected");
    }
  }
}

const signalingServer = SignalingServer();
export default signalingServer;
