/**
 * Connection State Tracker
 * Tracks and displays RTCPeerConnection states and ICE states
 */

class ConnectionStateTracker {
  constructor() {
    this.states = new Map();
    this.onStateChange = null;
  }
  /**
   * Update connection state
   * @param {string} peerId - Peer identifier
   * @param {RTCPeerConnection} pc - Peer connection
   */
  updateConnectionState(peerId, pc) {
    const state = this.states.get(peerId);
    if (state) {
      state.connectionState = pc.connectionState;
      this.setOnStateChange(this.states);
    }
  }

  /**
   * Update ICE connection state
   * @param {string} peerId - Peer identifier
   * @param {RTCPeerConnection} pc - Peer connection
   */
  updateIceConnectionState(peerId, pc) {
    const state = this.states.get(peerId);
    if (state) {
      state.iceConnectionState = pc.iceConnectionState;
      this.setOnStateChange(this.states);
    }
  }

  /**
   * Update ICE gathering state
   * @param {string} peerId - Peer identifier
   * @param {RTCPeerConnection} pc - Peer connection
   */
  updateIceGatheringState(peerId, pc) {
    const state = this.states.get(peerId);
    if (state) {
      state.iceGatheringState = pc.iceGatheringState;
      this.setOnStateChange(this.states);
    }
  }

  /**
   * Update signaling state
   * @param {string} peerId - Peer identifier
   * @param {RTCPeerConnection} pc - Peer connection
   */
  updateSignalingState(peerId, pc) {
    const state = this.states.get(peerId);
    if (state) {
      state.signalingState = pc.signalingState;
      this.setOnStateChange(this.states);
    }
  }

  /**
   * Track a peer connection's states
   * @param {string} peerId - Peer identifier
   * @param {RTCPeerConnection} pc - Peer connection to track
   */
  trackConnection(peerId, pc) {
    const state = {
      peerId,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState
    };

    this.states.set(peerId, state);

    // Setup event listeners
    pc.addEventListener("connectionstatechange", () => {
      this.updateConnectionState(peerId, pc);
    });

    pc.addEventListener("iceconnectionstatechange", () => {
      this.updateIceConnectionState(peerId, pc);
    });

    pc.addEventListener("icegatheringstatechange", () => {
      this.updateIceGatheringState(peerId, pc);
    });

    pc.addEventListener("signalingstatechange", () => {
      this.updateSignalingState(peerId, pc);
    });

    // Initial update
    this.updateAllStates(peerId, pc);
    this.setOnStateChange(this.states);
  }
  /**
   * Update all states for a peer
   * @param {string} peerId - Peer identifier
   * @param {RTCPeerConnection} pc - Peer connection
   */
  updateAllStates(peerId, pc) {
    const state = this.states.get(peerId);
    if (state && pc) {
      state.connectionState = pc.connectionState;
      state.iceConnectionState = pc.iceConnectionState;
      state.iceGatheringState = pc.iceGatheringState;
      state.signalingState = pc.signalingState;
    }
  }

  /**
   * Remove tracking for a peer
   * @param {string} peerId - Peer identifier
   */
  untrackConnection(peerId) {
    this.states.delete(peerId);
    this.setOnStateChange(this.states);
  }

  /**
   * Get state for a peer
   * @param {string} peerId - Peer identifier
   * @returns {Object|null} State object or null
   */
  getState(peerId) {
    return this.states.get(peerId) || null;
  }

  /**
   * Get all states
   * @returns {Map} Map of all tracked states
   */
  getAllStates() {
    return new Map(this.states);
  }
  /**
   * Get state summary for logging
   * @param {string} peerId - Peer identifier
   * @returns {string} State summary string
   */
  getStateSummary(peerId) {
    const state = this.states.get(peerId);
    if (!state) {
      return "Unknown";
    }

    return `conn:${state.connectionState}, iceConn:${state.iceConnectionState}, iceGath:${state.iceGatheringState}, sig:${state.signalingState}`;
  }

  setOnStateChange(callback) {
    this.onStateChange = callback;
  }
}

// Export singleton instance
const connectionStateTracker = new ConnectionStateTracker();
export default connectionStateTracker;
