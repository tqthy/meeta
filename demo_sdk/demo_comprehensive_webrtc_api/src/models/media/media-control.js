import errorHandler from "../error/error-handler.js";

class MediaControl {
  constructor() {
    this.currentStream = null;
  }

  /**
   * Get user media (camera and microphone)
   * @param {MediaStreamConstraints} constraints - Media constraints
   * @returns {Promise<MediaStream>} Media stream
   */
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      return stream;
    } catch (error) {
      errorHandler.handleGetUserMediaError(error);
      throw error;
    }
  }
}

const mediaControl = new MediaControl();
export default mediaControl;
