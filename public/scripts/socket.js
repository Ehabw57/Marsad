const HEARTBEAT_INTERVAL = 30000;
const MAX_RETRIES = 3;
const { CountUp } = await import("./countUp.min.js");
let lastpong = Date.now();
let socket;
let retryCount = 0;
const greenBar = document.getElementById("green-bar");
const yellowBar = document.getElementById("yellow-bar");
const redBar = document.getElementById("red-bar");
const noDataBar = document.getElementById("no-data-bar");
const bars = [noDataBar, redBar, yellowBar, greenBar];

window.sendEvent = function (event) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(event);
};

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

    if (!greenPresent && !yellowPresent && !redPresent) {
      bars.forEach((bar) => {
        if (bar !== noDataBar) {
          bar.textContent = "";
          bar.style.height = `0%`;
        }
      });
      noDataBar.style.height = `100%`;
      noDataBar.textContent = `لاتوجد بيانات`;
      return;
    }

    noDataBar.style.height = `0%`;
    noDataBar.textContent = "";
    greenBar.style.height = `${greenPresent}%`;
    new CountUp(greenBar, greenPresent, {
      duration: 0.5,
      startVal: parseFloat(greenBar.textContent) || 0,
      suffix: "%",
    }).start();

    yellowBar.style.height = `${yellowPresent}%`;
    new CountUp(yellowBar, yellowPresent, {
      duration: 0.5,
      startVal: parseFloat(yellowBar.textContent) || 0,
      suffix: "%",
    }).start();

    redBar.style.height = `${redPresent}%`;
    new CountUp(redBar, redPresent, {
      duration: 0.5,
      startVal: parseFloat(redBar.textContent) || 0,
      suffix: "%",
    }).start();

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
