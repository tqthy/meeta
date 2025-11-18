/**
 * DTLS/SCTP Transport Monitor - Monitor DTLS and SCTP transport states
 * Tracks RTCDtlsTransport and RTCSctpTransport state changes
 */

class DTLS_SCTP {
  constructor() {
    this.transports = new Map(); // peerId -> { dtls, sctp }
  }

  /**
   * Monitor transports for a peer connection
   * @param {RTCPeerConnection} pc - Peer connection
   * @param {string} peerId - Peer identifier
   */
  monitorTransports(pc, peerId) {
    const transportInfo = {
      dtls: null,
      sctp: null
    };

    // Monitor DTLS transport
    if (pc.getSenders().length > 0 || pc.getReceivers().length > 0) {
      // DTLS transport is available via getStats or connection state
      // Note: Direct access to dtls transport may not be available in all browsers
      this.monitorDTLSState(pc, peerId, transportInfo);
    }

    // Monitor SCTP transport (for data channels)
    if (pc.sctp) {
      transportInfo.sctp = pc.sctp;
      this.monitorSCTPState(pc.sctp, peerId);
    }

    // Also monitor via stats
    this.monitorViaStats(pc, peerId, transportInfo);

    this.transports.set(peerId, transportInfo);
  }

  /**
   * Monitor DTLS state via connection state
   * @param {RTCPeerConnection} pc - Peer connection
   * @param {string} peerId - Peer identifier
   * @param {Object} transportInfo - Transport info object
   */
  monitorDTLSState(pc, peerId, transportInfo) {
    // DTLS state is reflected in connection state
    pc.addEventListener("connectionstatechange", () => {
      console.log(`DTLS/Connection state for ${peerId}: ${pc.connectionState}`);
      this.logTransportState(peerId, "dtls", pc.connectionState);
    });
  }

  /**
   * Monitor SCTP transport state
   * @param {RTCSctpTransport} sctp - SCTP transport
   * @param {string} peerId - Peer identifier
   */
  monitorSCTPState(sctp, peerId) {
    if (sctp && sctp.onstatechange !== undefined) {
      sctp.addEventListener("statechange", () => {
        console.log(`SCTP state for ${peerId}: ${sctp.state}`);
        this.logTransportState(peerId, "sctp", sctp.state);
      });

      // Initial state
      this.logTransportState(peerId, "sctp", sctp.state);
    }
  }

  /**
   * Monitor transports via getStats
   * @param {RTCPeerConnection} pc - Peer connection
   * @param {string} peerId - Peer identifier
   * @param {Object} transportInfo - Transport info object
   */
  async monitorViaStats(pc, peerId, transportInfo) {
    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === "transport") {
          console.log(`Transport stats for ${peerId}:`, {
            dtlsState: report.dtlsState,
            selectedCandidatePairId: report.selectedCandidatePairId
          });

          if (report.dtlsState) {
            this.logTransportState(peerId, "dtls", report.dtlsState);
          }
        }
      });
    } catch (error) {
      console.error(`Error getting transport stats for ${peerId}:`, error);
    }
  }

  /**
   * Log transport state
   * @param {string} peerId - Peer identifier
   * @param {string} type - Transport type: 'dtls' or 'sctp'
   * @param {string} state - Transport state
   */
  logTransportState(peerId, type, state) {
    // This could be displayed in a UI element
    // For now, just log to console
    const transportInfo = this.transports.get(peerId);
    if (transportInfo) {
      transportInfo[type] = { state, timestamp: new Date() };
    }
  }

  /**
   * Get transport state for a peer
   * @param {string} peerId - Peer identifier
   * @returns {Object|null} Transport info or null
   */
  getTransportState(peerId) {
    return this.transports.get(peerId) || null;
  }

  /**
   * Remove transport monitoring for a peer
   * @param {string} peerId - Peer identifier
   */
  removePeer(peerId) {
    this.transports.delete(peerId);
  }
}

// Export singleton instance
const dtlsSctp = new DTLS_SCTP();
export default dtlsSctp;
