import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  getDocs,
  deleteDoc
} from "firebase/firestore";

class RTCService {
  constructor(database, stunServers) {
    this.database = database;
    this.pc = new RTCPeerConnection(stunServers);

    this.localStream = null;
    this.remoteStream = new MediaStream();

    this.currentCallRef = null;
    this.unsubscribers = [];
  }

  async initializeLocalStream(video = true, audio = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: audio
      });
      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
      throw error;
    }
  }

  addTrackToPeerConnection() {
    if (!this.localStream) {
      throw new Error("Local stream is not initialized.");
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

  async createCall() {
    const callDocRef = doc(collection(this.database, "calls"));
    const id = callDocRef.id;

    const offerCandidates = collection(callDocRef, "offerCandidates");
    const answerCandidates = collection(callDocRef, "answerCandidates");
    this.currentCallRef = callDocRef;

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON()).catch((error) => {
          console.error(
            "Error adding ICE candidate to offerCandidates collection.",
            error
          );
        });
      }
    };

    const offerDescription = await this.pc.createOffer();
    await this.pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type
    };

    await setDoc(callDocRef, { offer });
    const unsubAnswer = onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answerDescription).catch((error) => {
          console.error("Error setting remote description from answer.", error);
        });
      }
    });
    this.unsubscribers.push(unsubAnswer);

    const unsubAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc.addIceCandidate(candidate).catch((error) => {
            console.error(
              "Error adding ICE candidate from answerCandidates collection.",
              error
            );
          });
        }
      });
    });
    this.unsubscribers.push(unsubAnswerCandidates);
    return id;
  }

  async joinCall(callId) {
    const callDocRef = doc(this.database, "calls", callId);
    const offerCandidates = collection(callDocRef, "offerCandidates");
    const answerCandidates = collection(callDocRef, "answerCandidates");
    this.currentCallRef = callDocRef;

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON()).catch((error) => {
          console.error(
            "Error adding ICE candidate to answerCandidates collection.",
            error
          );
        });
      }
    };

    const callSnap = await getDoc(callDocRef);
    if (!callSnap.exists()) {
      throw new Error("Call ID does not exist.");
    }

    const callData = callSnap.data();
    if (!callData?.offer) {
      throw new Error("No offer found in the call document.");
    }

    await this.pc
      .setRemoteDescription(new RTCSessionDescription(callData.offer))
      .catch((error) => {
        console.error("Error setting remote description from offer.", error);
      });

    const answerDescription = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answerDescription).catch((error) => {
      console.error("Error setting local description with answer.", error);
    });

    await updateDoc(callDocRef, {
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      }
    }).catch((error) => {
      console.error("Error updating call document with answer.", error);
    });

    const unsubOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc.addIceCandidate(candidate).catch((error) => {
            console.error(
              "Error adding ICE candidate from offerCandidates collection.",
              error
            );
          });
        }
      });
    });
    this.unsubscribers.push(unsubOfferCandidates);
  }

  async addIceCandidate(candidate) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate.", error);
      throw error;
    }
  }

  cleanUpCallStreams() {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }

      if (this.remoteStream) {
        this.remoteStream
          .getTracks()
          .forEach((track) => this.remoteStream.removeTrack(track));
        this.remoteStream = null;
      }
    } catch (error) {
      console.error("Error cleaning up streams.", error);
      throw error;
    }
  }

  async cleanUpFirestoreData() {
    if (!this.currentCallRef) return;

    try {
      const offerCandSnap = await getDocs(
        collection(this.currentCallRef, "offerCandidates")
      );
      await Promise.all(offerCandSnap.docs.map((doc) => deleteDoc(doc.ref)));

      const answerCandSnap = await getDocs(
        collection(this.currentCallRef, "answerCandidates")
      );
      await Promise.all(answerCandSnap.docs.map((doc) => deleteDoc(doc.ref)));

      await deleteDoc(this.currentCallRef);
    } catch (error) {
      console.error("Error cleaning up Firestore data.", error);
      throw error;
    }
  }

  async hangUp() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    try {
      if (this.pc) this.pc.close();
    } catch (error) {
      console.error("Error closing peer connection.", error);
      throw error;
    }

    this.cleanUpCallStreams();
    await this.cleanUpFirestoreData();
    this.currentCallRef = null;
  }

  reset() {
    this.pc = new RTCPeerConnection(servers);
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.currentCallRef = null;
    this.unsubscribers = [];
  }

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

  getIceConnectionState() {
    return this.pc.iceConnectionState;
  }
}

export default RTCService;
