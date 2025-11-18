import errorHandler from "../error/error-handler.js";
import mediaControl from "../media/media-control.js";
import trackEvents from "../media/track-event.js";
import connectionStateTracker from "../trackers/connection-state-tracker.js";
import dataChannelManager from "../media/datachannel-manager.js";
import rtcConfig from "./rtc-config.js";
import signalingServer from "./signalling-server.js";
import dtlsSctp from "../trackers/DTLS-SCTP-tracker.js";

class RTCConnection {
  constructor() {
    this.localStream = null;
    this.remoteStreams = new Map();

    this.peerConnections = new Map(); // Map of peerId -> RTCPeerConnection

    this.addLocalVideo = null;
  }

  async initializeLocalMedia() {
    try {
      this.localStream = await mediaControl.getUserMedia({
        video: true,
        audio: true
      });
      this.addLocalVideo(this.localStream);
    } catch (error) {
      errorHandler.handleGetUserMediaError(error);
      throw error;
    }
  }

  async createPeerConnection(targetPeerId) {
    if (this.peerConnections.has(targetPeerId)) {
      console.log("Peer connection already exists:", targetPeerId);
      return;
    }

    try {
      const config = rtcConfig.getConfiguration();
      const pc = new RTCPeerConnection(config);
      errorHandler.setupPeerConnectionErrorHandlers(pc, targetPeerId);
      connectionStateTracker.trackConnection(targetPeerId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signalingServer.sendSignalingMessage({
            type: "ice-candidate",
            targetPeerId: fromPeerId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        this.handleRemoteTrack(targetPeerId, event);
      };

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          pc.addTrack(track, this.localStream);
        });
      }

      this.peerConnections.set(fromPeerId, pc);
      dataChannelManager.setupDataChannel(pc, fromPeerId);
      dtlsSctp.monitorTransports(pc, fromPeerId);
    } catch (error) {
      errorHandler.handleError(error, `create-peer-connection-${targetPeerId}`);
    }
  }

  /**
   * Handle remote track
   */
  handleRemoteTrack(peerId, event) {
    const [stream] = event.streams;

    if (stream) {
      this.remoteStreams.set(peerId, stream);
      this.addRemoteVideo(peerId, stream);

      // Setup track event handlers
      trackEvents.handleRemoteStreams(peerId, stream);
    }
  }

  setAddVideoStream(callback) {
    this.addLocalVideo = callback;
  }

  getLocalStream() {
    return this.localStream;
  }
}

const myRTCConnection = new RTCConnection();
export default myRTCConnection;
