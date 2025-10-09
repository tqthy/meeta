// src/main.js
import "./style.css";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import RTCService from "./services/rtc.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBAXkRqyNTCeeXk-CzH46Cu4c5tm3qvP8g",
  authDomain: "fir-webrtc-2b3e7.firebaseapp.com",
  projectId: "fir-webrtc-2b3e7",
  storageBucket: "fir-webrtc-2b3e7.firebasestorage.app",
  messagingSenderId: "1060633498945",
  appId: "1:1060633498945:web:823849d54195e8230d3dc0"
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize RTCService
// STUN/TURN servers
const servers = {
  iceservers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }
  ],
  icecandidatepoolsize: 10
};
let rtcService = new RTCService(db, servers);

// DOM elements
const startVideoButton = document.getElementById("startVideoBtn");
const callButton = document.getElementById("callBtn");
const joinBtn = document.getElementById("joinBtn");
const hangupButton = document.getElementById("hangupBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const joinInput = document.getElementById("joinInput");

// Set remote stream to video element
remoteVideo.srcObject = rtcService.getRemoteStream();

// UI initial state
callButton.disabled = true;
joinBtn.disabled = true;
hangupButton.disabled = true;

// 1) Start camera
startVideoButton.onclick = async () => {
  try {
    const stream = await rtcService.initializeLocalStream();

    // Attach local stream to video element
    localVideo.srcObject = stream;

    // Add local tracks to peer connection
    rtcService.addTrackToPeerConnection();

    // Enable call/join buttons
    callButton.disabled = false;
    joinBtn.disabled = false;
    startVideoButton.disabled = true;
  } catch (err) {
    console.error("Error accessing media devices:", err);
    alert("Không thể truy cập camera/microphone: " + err.message);
  }
};

// 2) Create call (offerer)
callButton.onclick = async () => {
  try {
    const callId = await rtcService.createCall();

    console.log("Created call with ID:", callId);
    alert("Call ID: " + callId);

    // Update UI
    hangupButton.disabled = false;
    callButton.disabled = true;
    joinBtn.disabled = true;
    joinInput.disabled = true;
  } catch (err) {
    console.error("Error creating call:", err);
    alert("Không thể tạo cuộc gọi: " + err.message);
  }
};

// 3) Join call (answerer)
joinBtn.onclick = async () => {
  const callId = joinInput.value.trim();

  if (!callId) {
    alert("Vui lòng nhập Call ID để tham gia.");
    return;
  }

  try {
    await rtcService.joinCall(callId);

    console.log("Joined call:", callId);

    // Update UI
    hangupButton.disabled = false;
    callButton.disabled = true;
    joinBtn.disabled = true;
    joinInput.disabled = true;
  } catch (err) {
    console.error("Error joining call:", err);
    alert("Không thể tham gia cuộc gọi: " + err.message);
  }
};

// 4) Hang up
hangupButton.onclick = async () => {
  try {
    await rtcService.hangup();

    // Reset UI
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    joinInput.value = "";
    joinInput.disabled = false;
    callButton.disabled = true;
    hangupButton.disabled = true;
    startVideoButton.disabled = false;

    // Create new RTCService instance for next call
    rtcService = new RTCService(db);
    remoteVideo.srcObject = rtcService.getRemoteStream();
  } catch (err) {
    console.error("Error hanging up:", err);
  }
};

// Cleanup on page unload
window.onunload = window.onbeforeunload = async () => {
  try {
    await rtcService.hangup();
  } catch (err) {
    console.warn("Error during cleanup:", err);
  }
};
