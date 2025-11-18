/**
 * Data Channel Manager - Create and manage RTCDataChannel for peer-to-peer communication
 * Handles chat messages via data channels
 */

import errorHandler from "../error/error-handler.js";

class DataChannelManager {
  constructor() {
    this.dataChannels = new Map(); // peerId -> RTCDataChannel
    this.pendingChannels = new Map(); // peerId -> pending channel

    this.displayChatMessage = null;
  }

  /**
   * Setup data channel for a peer connection
   * @param {RTCPeerConnection} pc - Peer connection
   * @param {string} peerId - Peer identifier
   */
  setupDataChannel(pc, peerId) {
    // Create data channel
    const channel = pc.createDataChannel("chat", {
      ordered: true // Messages are delivered in order
    });

    this.setupChannelHandlers(channel, peerId);
    this.dataChannels.set(peerId, channel);

    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      const incomingChannel = event.channel;
      this.setupChannelHandlers(incomingChannel, peerId);
      this.dataChannels.set(peerId, incomingChannel);
    };
  }

  /**
   * Setup event handlers for a data channel
   * @param {RTCDataChannel} channel - Data channel
   * @param {string} peerId - Peer identifier
   */
  setupChannelHandlers(channel, peerId) {
    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      this.displayChatMessage(
        "System",
        `Connected to ${peerId.substring(0, 8)}...`,
        "system"
      );
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.displayChatMessage(
        "System",
        `Disconnected from ${peerId.substring(0, 8)}...`,
        "system"
      );
    };

    channel.onerror = (error) => {
      errorHandler.handleError(error, `data-channel-${peerId}`);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleChatMessage(peerId, message);
      } catch (error) {
        // Handle plain text messages
        this.displayChatMessage(`Peer ${peerId.substring(0, 8)}`, event.data);
      }
    };
  }

  setOnChatMessage(callback) {
    this.displayChatMessage = callback;
  }
}

// Export singleton instance
const dataChannelManager = new DataChannelManager();
export default dataChannelManager;
