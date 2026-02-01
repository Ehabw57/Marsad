const HEARTBEAT_INTERVAL = 30000;
const MAX_RETRIES = 3;
let lastpong = Date.now();
let socket;
let retryCount = 0;

function sendEvent(event) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(event);
}

function connect() {
  socket = new WebSocket(window.SERVER_URL || "ws://localhost:8080");
  socket.onopen = () => {
    retryCount = 0;
    lastpong = Date.now();
    console.log("WebSocket connection established");
  };

  socket.onerror = (error) => {
    retryCount++;
    console.error("WebSocket error:", error);
  };

  socket.onmessage = (event) => {
    if (event.data === "pong") {
      lastpong = Date.now();
      return;
    }
    const data = JSON.parse(event.data);
    const greenPresent = (data.green / data.count) * 100;
    const yellowPresent = (data.yellow / data.count) * 100;
    const redPresent = (data.red / data.count) * 100;
    const bars = document.querySelectorAll(".bar");
    bars.forEach((bar) => {
      bar.style.height = "0";
      bar.textContent = "";
    });
    if (!greenPresent && !yellowPresent && !redPresent) {
      bars[0].style.height = `100%`;
      bars[0].textContent = `لاتوجد بيانات`;
      return;
    }
    if (greenPresent) {
      bars[3].style.height = `${greenPresent}%`;
      bars[3].textContent = `${Math.floor(greenPresent)}%`;
    }
    if (yellowPresent) {
      bars[2].style.height = `${yellowPresent}%`;
      bars[2].textContent = `${Math.floor(yellowPresent)}%`;
    }
    if (redPresent) {
      bars[1].style.height = `${redPresent}%`;
      bars[1].textContent = `${Math.floor(redPresent)}%`;
    }

    const studentCount = document.querySelector(".student-count strong");
    studentCount.textContent = data.count;
  };
  socket.onclose = () => {
    reconnect();
  };
}

function reconnect() {
  if (retryCount >= MAX_RETRIES) {
    clearInterval(interval);
    console.error("Max retries reached. Could not reconnect to WebSocket.");
    return;
  }
  console.log("Attempting to reconnect...");
  setTimeout(() => {
    connect();
  }, 2000);
}

const interval = setInterval(() => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (Date.now() - lastpong > HEARTBEAT_INTERVAL + 5000) {
    console.warn("No pong received, reconnecting...");
    socket.close();
    return;
  }
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send("ping");
  }
}, HEARTBEAT_INTERVAL);

connect();
