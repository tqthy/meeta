/**
 * RTCConfiguration Management
 * Handles WebRTC configuration including ICE servers, policies, and certificates
 */

class RTCConfig {
  constructor() {
    // Default ICE servers (STUN only, no TURN for demo)
    this.defaultIceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ];

    // Default RTCConfiguration
    this.defaultConfig = {
      iceServers: this.defaultIceServers,
      iceTransportPolicy: "all", // 'all' or 'relay'
      bundlePolicy: "max-bundle", // 'balanced', 'max-compat', 'max-bundle'
      rtcpMuxPolicy: "require", // 'negotiate' or 'require'
      iceCandidatePoolSize: 0 // 0-10, pre-gather candidates
    };

    this.currentConfig = { ...this.defaultConfig };
    this.customCertificate = null;
  }

  /**
   * Get current RTCConfiguration
   * @returns {RTCConfiguration} Current configuration
   */
  getConfiguration() {
    const config = { ...this.currentConfig };

    // Add custom certificate if available
    if (this.customCertificate) {
      config.certificates = [this.customCertificate];
    }

    return config;
  }

  /**
   * Update ICE servers
   * @param {Array} iceServers - Array of RTCIceServer objects
   */
  setIceServers(iceServers) {
    if (!Array.isArray(iceServers)) {
      throw new Error("ICE servers must be an array");
    }

    // Validate ICE server format
    iceServers.forEach((server) => {
      if (!server.urls) {
        throw new Error("ICE server must have urls property");
      }
    });

    this.currentConfig.iceServers = iceServers;
    this.notifyConfigChange();
  }

  /**
   * Set ICE transport policy
   * @param {string} policy - 'all' or 'relay'
   */
  setIceTransportPolicy(policy) {
    if (policy !== "all" && policy !== "relay") {
      throw new Error('ICE transport policy must be "all" or "relay"');
    }
    this.currentConfig.iceTransportPolicy = policy;
    this.notifyConfigChange();
  }

  /**
   * Set bundle policy
   * @param {string} policy - 'balanced', 'max-compat', or 'max-bundle'
   */
  setBundlePolicy(policy) {
    const validPolicies = ["balanced", "max-compat", "max-bundle"];
    if (!validPolicies.includes(policy)) {
      throw new Error(
        `Bundle policy must be one of: ${validPolicies.join(", ")}`
      );
    }
    this.currentConfig.bundlePolicy = policy;
    this.notifyConfigChange();
  }

  /**
   * Set RTCP mux policy
   * @param {string} policy - 'negotiate' or 'require'
   */
  setRtcpMuxPolicy(policy) {
    if (policy !== "negotiate" && policy !== "require") {
      throw new Error('RTCP mux policy must be "negotiate" or "require"');
    }
    this.currentConfig.rtcpMuxPolicy = policy;
    this.notifyConfigChange();
  }

  /**
   * Set ICE candidate pool size
   * @param {number} size - Pool size (0-10)
   */
  setIceCandidatePoolSize(size) {
    const poolSize = Math.max(0, Math.min(10, Math.floor(size)));
    this.currentConfig.iceCandidatePoolSize = poolSize;
    this.notifyConfigChange();
  }

  /**
   * Set custom RTCCertificate
   * @param {RTCCertificate} certificate - Custom certificate
   */
  setCertificate(certificate) {
    if (certificate && !(certificate instanceof RTCCertificate)) {
      throw new Error("Certificate must be an RTCCertificate instance");
    }
    this.customCertificate = certificate;
    this.notifyConfigChange();
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    this.currentConfig = { ...this.defaultConfig };
    this.customCertificate = null;
    this.notifyConfigChange();
  }

  /**
   * Parse ICE servers from JSON string
   * @param {string} jsonString - JSON string representation of ICE servers
   * @returns {Array} Parsed ICE servers array
   */
  parseIceServers(jsonString) {
    try {
      const servers = JSON.parse(jsonString);
      if (!Array.isArray(servers)) {
        throw new Error("ICE servers must be an array");
      }
      return servers;
    } catch (error) {
      throw new Error(`Invalid ICE servers JSON: ${error.message}`);
    }
  }

  /**
   * Get configuration as JSON string
   * @returns {string} JSON string representation
   */
  toJSON() {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Notify about configuration changes (can be overridden)
   */
  notifyConfigChange() {
    // This can be used to notify other parts of the application
    if (window.configChangeCallback) {
      window.configChangeCallback(this.getConfiguration());
    }
  }
}

// Export singleton instance
const rtcConfig = new RTCConfig();
export default rtcConfig;
