// src/main.js với UI kiểm soát quyền truy cập
import "./style.css";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import RTCService from "./services/rtc2.js";

const {
  VITE_API_KEY,
  VITE_AUTH_DOMAIN,
  VITE_PROJECT_ID,
  VITE_STORAGE_BUCKET,
  VITE_MESSAGING_SENDER_ID,
  VITE_APP_ID
} = import.meta.env;

// Firebase config
const firebaseConfig = {
  apiKey: VITE_API_KEY,
  authDomain: VITE_AUTH_DOMAIN,
  projectId: VITE_PROJECT_ID,
  storageBucket: VITE_STORAGE_BUCKET,
  messagingSenderId: VITE_MESSAGING_SENDER_ID,
  appId: VITE_APP_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

let rtcService = new RTCService(db);

// DOM elements
const startVideoButton = document.getElementById("startVideoBtn");
const callButton = document.getElementById("callBtn");
const requestJoinBtn = document.getElementById("requestJoinBtn");
const hangupButton = document.getElementById("hangupBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const callIdInput = document.getElementById("callIdInput");
const userNameInput = document.getElementById("userNameInput");
const statusDiv = document.getElementById("status");

// Approval modal elements
const approvalModal = document.getElementById("approvalModal");
const approvalMessage = document.getElementById("approvalMessage");
const approveBtn = document.getElementById("approveBtn");
const rejectBtn = document.getElementById("rejectBtn");

// Waiting modal elements
const waitingModal = document.getElementById("waitingModal");
const waitingMessage = document.getElementById("waitingMessage");

let currentRequestId = null;
let currentRequestUserId = null;

remoteVideo.srcObject = rtcService.getRemoteStream();

// UI initial state
callButton.disabled = true;
requestJoinBtn.disabled = true;
hangupButton.disabled = true;

// Helper functions
function showStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";

  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 5000);
}

function showApprovalModal(userName) {
  approvalMessage.textContent = `${userName} muốn tham gia cuộc gọi. Bạn có chấp nhận không?`;
  approvalModal.style.display = "flex";
}

function hideApprovalModal() {
  approvalModal.style.display = "none";
}

function showWaitingModal(message) {
  waitingMessage.textContent = message;
  waitingModal.style.display = "flex";
}

function hideWaitingModal() {
  waitingModal.style.display = "none";
}

// Setup callbacks cho RTCService
rtcService.onJoinRequestReceived = (requestInfo) => {
  console.log("📨 Received join request:", requestInfo);

  // Lưu request info
  currentRequestId = requestInfo.requestId;
  currentRequestUserId = requestInfo.userId;

  // Hiển thị modal phê duyệt
  showApprovalModal(requestInfo.userName);

  // Play notification sound (optional)
  playNotificationSound();
};

rtcService.onJoinRequestStatusChanged = (status, reason) => {
  hideWaitingModal();

  if (status === "approved") {
    showStatus(
      "✅ Yêu cầu của bạn đã được chấp nhận! Đang kết nối...",
      "success"
    );
  } else if (status === "rejected") {
    showStatus(`❌ Yêu cầu bị từ chối: ${reason}`, "error");
  }
};

// 1) Start camera
startVideoButton.onclick = async () => {
  try {
    const stream = await rtcService.initializeLocalStream();
    localVideo.srcObject = stream;
    rtcService.addTrackToPeerConnection();

    callButton.disabled = false;
    requestJoinBtn.disabled = false;
    startVideoButton.disabled = true;

    showStatus("✅ Camera đã sẵn sàng", "success");
  } catch (err) {
    console.error("Error accessing media devices:", err);
    showStatus(
      "❌ Không thể truy cập camera/microphone: " + err.message,
      "error"
    );
  }
};

// 2) Create call (HOST)
callButton.onclick = async () => {
  try {
    const hostName = userNameInput.value.trim() || "Host";
    const callId = await rtcService.createCall(hostName);

    // Hiển thị Call ID
    callIdInput.value = callId;

    console.log("✅ Room created:", callId);
    showStatus(`✅ Phòng đã tạo! Call ID: ${callId}`, "success");

    // Copy to clipboard
    navigator.clipboard.writeText(callId).then(() => {
      showStatus("📋 Call ID đã được copy vào clipboard!", "success");
    });

    // Update UI
    hangupButton.disabled = false;
    callButton.disabled = true;
    requestJoinBtn.disabled = true;
    callIdInput.disabled = true;
    userNameInput.disabled = true;
  } catch (err) {
    console.error("Error creating call:", err);
    showStatus("❌ Không thể tạo phòng: " + err.message, "error");
  }
};

// 3) Request to join (JOINER)
requestJoinBtn.onclick = async () => {
  const callId = callIdInput.value.trim();
  const userName = userNameInput.value.trim();

  if (!callId) {
    showStatus("⚠️ Vui lòng nhập Call ID", "warning");
    return;
  }

  if (!userName) {
    showStatus("⚠️ Vui lòng nhập tên của bạn", "warning");
    return;
  }

  try {
    showWaitingModal("Đang gửi yêu cầu tham gia...");

    // Gửi request và chờ approval
    await rtcService.requestToJoin(callId, userName);

    // Nếu được approve, bắt đầu join
    showWaitingModal("Đang kết nối...");
    await rtcService.joinCallAfterApproval();

    hideWaitingModal();
    showStatus("✅ Đã kết nối thành công!", "success");

    // Update UI
    hangupButton.disabled = false;
    callButton.disabled = true;
    requestJoinBtn.disabled = true;
    callIdInput.disabled = true;
    userNameInput.disabled = true;
  } catch (err) {
    console.error("Error joining call:", err);
    hideWaitingModal();
    showStatus("❌ " + err.message, "error");
  }
};

// 4) Approve join request (HOST)
approveBtn.onclick = async () => {
  try {
    hideApprovalModal();
    showStatus("✅ Đang chấp nhận yêu cầu...", "info");

    await rtcService.approveJoinRequest(currentRequestId, currentRequestUserId);

    showStatus("✅ Đã chấp nhận! Đang thiết lập kết nối...", "success");

    currentRequestId = null;
    currentRequestUserId = null;
  } catch (err) {
    console.error("Error approving request:", err);
    showStatus("❌ Lỗi khi chấp nhận: " + err.message, "error");
  }
};

// 5) Reject join request (HOST)
rejectBtn.onclick = async () => {
  try {
    hideApprovalModal();

    await rtcService.rejectJoinRequest(
      currentRequestId,
      currentRequestUserId,
      "Host đã từ chối yêu cầu"
    );

    showStatus("❌ Đã từ chối yêu cầu", "info");

    currentRequestId = null;
    currentRequestUserId = null;
  } catch (err) {
    console.error("Error rejecting request:", err);
    showStatus("❌ Lỗi khi từ chối: " + err.message, "error");
  }
};

// 6) Hang up
hangupButton.onclick = async () => {
  try {
    await rtcService.hangup();

    // Reset UI
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    callIdInput.value = "";
    callIdInput.disabled = false;
    userNameInput.disabled = false;
    callButton.disabled = true;
    hangupButton.disabled = true;
    startVideoButton.disabled = false;

    showStatus("📞 Đã ngắt kết nối", "info");

    // Create new service
    rtcService = new RTCService(db);
    remoteVideo.srcObject = rtcService.getRemoteStream();

    // Re-setup callbacks
    rtcService.onJoinRequestReceived = (requestInfo) => {
      currentRequestId = requestInfo.requestId;
      currentRequestUserId = requestInfo.userId;
      showApprovalModal(requestInfo.userName);
      playNotificationSound();
    };

    rtcService.onJoinRequestStatusChanged = (status, reason) => {
      hideWaitingModal();
      if (status === "approved") {
        showStatus("✅ Yêu cầu đã được chấp nhận!", "success");
      } else if (status === "rejected") {
        showStatus(`❌ Yêu cầu bị từ chối: ${reason}`, "error");
      }
    };
  } catch (err) {
    console.error("Error hanging up:", err);
  }
};

// Optional: Notification sound
function playNotificationSound() {
  const audio = new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRQ0PVKzn7bNgGgc8ktjwxnkpBS5+zPDajkELElyx6OywYBoGPJHY8MZ5KQUufszw2o5BCxJcsejssGAaBjyR2PDGeSx"
  );
  audio.play().catch((e) => console.log("Could not play sound"));
}

// Cleanup on page unload
window.onunload = window.onbeforeunload = async () => {
  try {
    await rtcService.hangup();
  } catch (err) {
    console.warn("Error during cleanup:", err);
  }
};
