/**
 * Track Events - Handle remote track events
 * Monitors track, trackstarted, trackended, and MediaStreamTrack states
 */

class TrackEvents {
  constructor() {
    this.trackHandlers = new Map(); // peerId -> Set of tracks
    this.updateTrackIndicator = null;
  }

  /**
   * Handle remote stream and setup track event handlers
   * @param {string} peerId - Peer identifier
   * @param {MediaStream} stream - Remote media stream
   */
  handleRemoteStreams(peerId, stream) {
    if (!this.trackHandlers.has(peerId)) {
      this.trackHandlers.set(peerId, new Set());
    }

    const tracks = this.trackHandlers.get(peerId);

    stream.getTracks().forEach((track) => {
      if (!tracks.has(track.id)) {
        this.setupTrackHandlers(peerId, track);
        tracks.add(track.id);
      }
    });

    // Handle stream ended
    stream.addEventListener("removetrack", (event) => {
      console.log(`Track removed from stream for ${peerId}:`, event.track.kind);
      tracks.delete(event.track.id);
    });

    // Handle stream addtrack
    stream.addEventListener("addtrack", (event) => {
      console.log(`Track added to stream for ${peerId}:`, event.track.kind);
      if (!tracks.has(event.track.id)) {
        this.setupTrackHandlers(peerId, event.track);
        tracks.add(event.track.id);
      }
    });
  }

  /**
   * Setup event handlers for a track
   * @param {string} peerId - Peer identifier
   * @param {MediaStreamTrack} track - Media track
   */
  setupTrackHandlers(peerId, track) {
    // Track muted/unmuted
    track.addEventListener("mute", () => {
      console.log(`Track muted for ${peerId}: ${track.kind} (${track.id})`);
      this.updateTrackIndicator(peerId, track, "muted");
    });

    track.addEventListener("unmute", () => {
      console.log(`Track unmuted for ${peerId}: ${track.kind} (${track.id})`);
      this.updateTrackIndicator(peerId, track, "active");
    });

    // Track ended
    track.addEventListener("ended", () => {
      console.log(`Track ended for ${peerId}: ${track.kind} (${track.id})`);
      this.updateTrackIndicator(peerId, track, "ended");
    });

    // Initial state
    if (track.muted) {
      this.updateTrackIndicator(peerId, track, "muted");
    } else if (track.readyState === "ended") {
      this.updateTrackIndicator(peerId, track, "ended");
    } else {
      this.updateTrackIndicator(peerId, track, "active");
    }
  }

  /**
   * Remove tracking for a peer
   * @param {string} peerId - Peer identifier
   */
  removePeer(peerId) {
    this.trackHandlers.delete(peerId);
  }

  /**
   * Get track state for a peer
   * @param {string} peerId - Peer identifier
   * @returns {Array} Array of track states
   */
  getTrackStates(peerId) {
    const tracks = this.trackHandlers.get(peerId);
    if (!tracks) {
      return [];
    }

    // This would require storing track references
    // For now, return empty array
    return [];
  }

  setOnTrackStateChange(callback) {
    this.updateTrackIndicator = callback;
  }
}

// Export singleton instance
const trackEvents = new TrackEvents();
export default trackEvents;
