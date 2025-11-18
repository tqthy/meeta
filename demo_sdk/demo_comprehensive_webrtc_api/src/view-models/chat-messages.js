import dataChannelManager from "../models/media/datachannel-manager.js";

function initializeisplayChatMessage() {
  dataChannelManager.setOnChatMessage((sender, message, type = "normal") => {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) {
      return;
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message";

    if (type === "system") {
      messageDiv.style.borderLeftColor = "#ff9800";
    }

    const senderDiv = document.createElement("div");
    senderDiv.className = "sender";
    senderDiv.textContent = sender;

    const textDiv = document.createElement("div");
    textDiv.className = "text";
    textDiv.textContent = message;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    chatMessages.appendChild(messageDiv);

    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

initializeisplayChatMessage();
