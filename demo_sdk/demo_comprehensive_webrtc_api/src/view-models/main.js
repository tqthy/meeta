import myRTCConnection from "../models/connection/rtc-connection.js";
let camera1 = null;

let init = async () => {
  await myRTCConnection.initializeLocalMedia();

  myRTCConnection.setAddVideoStream(addLocalVideo);

  camera1 = document.getElementById("user-1").srcObject =
    myRTCConnection.getLocalStream();
};

function addLocalVideo(stream) {
  const videoGrid = document.getElementById("videoGrid");
  const existing = document.getElementById("localVideo");

  if (existing) {
    existing.remove();
  }

  const container = document.createElement("div");
  container.id = "localVideo";
  container.className = "video-container local";

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;

  const label = document.createElement("div");
  label.className = "video-label";
  label.textContent = `${this.username} (You)`;

  container.appendChild(video);
  container.appendChild(label);
  videoGrid.appendChild(container);
}

init();
