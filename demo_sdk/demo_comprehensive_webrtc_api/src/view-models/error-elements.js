import errorHandler from "../models/error/error-handler.js";

function initializeErrorDisplay() {
  const errorDisplay = document.getElementById("errorDisplay");
  if (!errorDisplay) {
    console.warn(
      "Error display element not found - error display will use console only"
    );
    return;
  }

  errorHandler.setOnDisplay((message, type = "error") => {
    // Set message and type
    errorDisplay.textContent = message;
    errorDisplay.className = `error-display show ${type}`;
  });

  errorHandler.setOnClear(() => errorDisplay.classList.remove("show"));
}

initializeErrorDisplay();
