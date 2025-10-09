// RTCService.js với hệ thống phê duyệt
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

const servers = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }
  ],
  iceCandidatePoolSize: 10
};

class RTCService {
  constructor(db) {
    this.db = db;
    this.pc = new RTCPeerConnection(servers);
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.currentCallRef = null;
    this.currentUserId = null;
    this.unsubscribers = [];
    this.isHost = false;

    // Callbacks cho events
    this.onJoinRequestReceived = null; // Callback khi host nhận join request
    this.onJoinRequestStatusChanged = null; // Callback khi joiner nhận response
  }

  async initializeLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      return this.localStream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      throw err;
    }
  }

  addTrackToPeerConnection() {
    if (!this.localStream) {
      throw new Error("Local stream not initialized");
    }

    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream);
    });

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };
  }

  // HOST: Tạo phòng mới
  async createCall(hostName = "Host") {
    const callDocRef = doc(collection(this.db, "calls"));
    const callId = callDocRef.id;

    this.currentCallRef = callDocRef;
    this.currentUserId = hostName;
    this.isHost = true;

    // Tạo document với thông tin phòng
    await setDoc(callDocRef, {
      hostId: hostName,
      hostName: hostName,
      status: "waiting", // waiting | active | ended
      createdAt: serverTimestamp(),
      maxParticipants: 2, // Giới hạn số người
      currentParticipants: 1
    });

    console.log("✅ Room created:", callId);

    // Lắng nghe join requests
    this.listenForJoinRequests(callDocRef);

    return callId;
  }

  // HOST: Lắng nghe join requests
  listenForJoinRequests(callDocRef) {
    const joinRequestsRef = collection(callDocRef, "joinRequests");

    const unsubJoinRequests = onSnapshot(joinRequestsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const requestData = change.doc.data();
          const requestId = change.doc.id;

          // Chỉ xử lý request pending
          if (requestData.status === "pending") {
            console.log("🔔 New join request from:", requestData.userName);

            // Gọi callback để UI xử lý (hiển thị popup)
            if (this.onJoinRequestReceived) {
              this.onJoinRequestReceived({
                requestId,
                userId: requestData.userId,
                userName: requestData.userName,
                timestamp: requestData.timestamp
              });
            }
          }
        }
      });
    });

    this.unsubscribers.push(unsubJoinRequests);
  }

  // HOST: Phê duyệt join request
  async approveJoinRequest(requestId, userId) {
    if (!this.isHost || !this.currentCallRef) {
      throw new Error("Only host can approve requests");
    }

    const requestRef = doc(this.currentCallRef, "joinRequests", requestId);

    await updateDoc(requestRef, {
      status: "approved",
      approvedAt: serverTimestamp()
    });

    console.log("✅ Approved join request:", userId);

    // Sau khi approve, bắt đầu setup WebRTC connection
    await this.setupHostConnection();
  }

  // HOST: Từ chối join request
  async rejectJoinRequest(requestId, userId, reason = "Host declined") {
    if (!this.isHost || !this.currentCallRef) {
      throw new Error("Only host can reject requests");
    }

    const requestRef = doc(this.currentCallRef, "joinRequests", requestId);

    await updateDoc(requestRef, {
      status: "rejected",
      rejectedAt: serverTimestamp(),
      reason: reason
    });

    console.log("❌ Rejected join request:", userId);
  }

  // HOST: Setup connection sau khi approve
  async setupHostConnection() {
    const offerCandidatesRef = collection(
      this.currentCallRef,
      "offerCandidates"
    );
    const answerCandidatesRef = collection(
      this.currentCallRef,
      "answerCandidates"
    );

    // Collect ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidatesRef, event.candidate.toJSON()).catch((e) =>
          console.warn("Failed to add offer candidate:", e)
        );
      }
    };

    // Create offer
    const offerDescription = await this.pc.createOffer();
    await this.pc.setLocalDescription(offerDescription);

    // Store offer
    await updateDoc(this.currentCallRef, {
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp
      },
      status: "active"
    });

    // Listen for answer
    const unsubAnswer = onSnapshot(this.currentCallRef, (snapshot) => {
      const data = snapshot.data();
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDesc = new RTCSessionDescription(data.answer);
        this.pc
          .setRemoteDescription(answerDesc)
          .catch((e) => console.warn("Failed to set remote description:", e));
      }
    });
    this.unsubscribers.push(unsubAnswer);

    // Listen for remote ICE candidates
    const unsubCandidates = onSnapshot(answerCandidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc
            .addIceCandidate(candidate)
            .catch((e) => console.warn("Failed to add ICE candidate:", e));
        }
      });
    });
    this.unsubscribers.push(unsubCandidates);
  }

  // JOINER: Request để tham gia phòng
  async requestToJoin(callId, userName) {
    const callDocRef = doc(this.db, "calls", callId);

    // Kiểm tra phòng có tồn tại không
    const callSnap = await getDoc(callDocRef);
    if (!callSnap.exists()) {
      throw new Error("Room not found");
    }

    const callData = callSnap.data();

    // Kiểm tra phòng đã đầy chưa
    if (callData.currentParticipants >= callData.maxParticipants) {
      throw new Error("Room is full");
    }

    // Kiểm tra phòng đã kết thúc chưa
    if (callData.status === "ended") {
      throw new Error("Room has ended");
    }

    this.currentCallRef = callDocRef;
    this.currentUserId = userName;
    this.isHost = false;

    // Tạo join request
    const joinRequestsRef = collection(callDocRef, "joinRequests");
    const userId = `user_${Date.now()}`;

    const requestRef = doc(joinRequestsRef, userId);
    await setDoc(requestRef, {
      userId: userId,
      userName: userName,
      status: "pending",
      timestamp: serverTimestamp()
    });

    console.log("📤 Join request sent, waiting for approval...");

    // Lắng nghe response từ host
    return new Promise((resolve, reject) => {
      const unsubRequest = onSnapshot(requestRef, (snapshot) => {
        const data = snapshot.data();

        if (data?.status === "approved") {
          console.log("✅ Join request approved!");

          // Gọi callback
          if (this.onJoinRequestStatusChanged) {
            this.onJoinRequestStatusChanged("approved");
          }

          unsubRequest(); // Stop listening
          resolve({ approved: true, userId });
        } else if (data?.status === "rejected") {
          console.log("❌ Join request rejected:", data.reason);

          if (this.onJoinRequestStatusChanged) {
            this.onJoinRequestStatusChanged("rejected", data.reason);
          }

          unsubRequest();
          reject(new Error(data.reason || "Join request rejected"));
        }
      });

      // Timeout sau 60 giây
      setTimeout(() => {
        unsubRequest();
        reject(new Error("Join request timeout"));
      }, 60000);
    });
  }

  // JOINER: Join phòng sau khi được approve
  async joinCallAfterApproval() {
    if (!this.currentCallRef) {
      throw new Error("No active call reference");
    }

    const offerCandidatesRef = collection(
      this.currentCallRef,
      "offerCandidates"
    );
    const answerCandidatesRef = collection(
      this.currentCallRef,
      "answerCandidates"
    );

    // ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidatesRef, event.candidate.toJSON()).catch((e) =>
          console.warn("Failed to add answer candidate:", e)
        );
      }
    };

    // Get call document
    const callSnap = await getDoc(this.currentCallRef);
    const callData = callSnap.data();

    if (!callData.offer) {
      throw new Error("No offer available");
    }

    // Set remote description
    await this.pc.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );

    // Create answer
    const answerDescription = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answerDescription);

    // Update with answer
    await updateDoc(this.currentCallRef, {
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      },
      currentParticipants: 2
    });

    // Listen for ICE candidates
    const unsubCandidates = onSnapshot(offerCandidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc
            .addIceCandidate(candidate)
            .catch((e) => console.warn("Failed to add ICE candidate:", e));
        }
      });
    });
    this.unsubscribers.push(unsubCandidates);

    console.log("✅ Successfully joined call!");
  }

  // Kick user (Host only)
  async kickUser(userId) {
    if (!this.isHost) {
      throw new Error("Only host can kick users");
    }

    await updateDoc(this.currentCallRef, {
      [`kicked.${userId}`]: true,
      kickedAt: serverTimestamp()
    });

    console.log("👢 Kicked user:", userId);
  }

  cleanUpCallStreams() {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.error("Error stopping tracks:", error);
    }
  }

  async cleanUpFirestoreData() {
    if (!this.currentCallRef) return;

    try {
      const offerCandSnap = await getDocs(
        collection(this.currentCallRef, "offerCandidates")
      );
      await Promise.all(offerCandSnap.docs.map((d) => deleteDoc(d.ref)));

      const answerCandSnap = await getDocs(
        collection(this.currentCallRef, "answerCandidates")
      );
      await Promise.all(answerCandSnap.docs.map((d) => deleteDoc(d.ref)));

      const joinRequestSnap = await getDocs(
        collection(this.currentCallRef, "joinRequests")
      );
      await Promise.all(joinRequestSnap.docs.map((d) => deleteDoc(d.ref)));

      await deleteDoc(this.currentCallRef);
    } catch (error) {
      console.warn("Error cleaning Firestore data:", error);
    }
  }

  async hangup() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    try {
      this.pc.close();
    } catch (error) {
      console.warn("Error closing peer connection:", error);
    }

    this.cleanUpCallStreams();
    await this.cleanUpFirestoreData();

    this.currentCallRef = null;
    this.currentUserId = null;
    this.isHost = false;
  }

  // Getters
  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getPeerConnection() {
    return this.pc;
  }

  getConnectionState() {
    return this.pc.connectionState;
  }

  isRoomHost() {
    return this.isHost;
  }
}

export default RTCService;
