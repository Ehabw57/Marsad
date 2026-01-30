const Websocket = require("ws");
const uuid = require("uuid");
const store = {};

const wss = new Websocket.Server({ port: 8080 });

function calculateUnderstanding() {
  let result = { count: 0, red: 0, yellow: 0, green: 0 };
    Object.values(store).forEach((item) => {
    if (item === "green") result.green++;
    if (item === "red") result.red++;
    if (item === "yellow") result.yellow++;
    result.count++;
  });
  return result;
}

function broadcastUnderstanding() {
  const understanding = calculateUnderstanding();
  wss.clients.forEach((client) => {
    if (client.readyState === Websocket.OPEN) {
      client.send(JSON.stringify(understanding));
    }
  });
}

wss.on("connection", (ws) => {
  ws.id = uuid.v4();
  store[ws.id] = "green";
  console.log(`New client connected: ${ws.id}`);
  broadcastUnderstanding();

  ws.on("message", (message) => {
    if (!message) return;
    store[ws.id] = message.toString();
    console.log(typeof message, message.toString());
    broadcastUnderstanding();
  });

  ws.on("close", () => {
    delete store[ws.id];
    console.log(`Client disconnected: ${ws.id}`);
    broadcastUnderstanding();
  });
});

console.log("WebSocket server is running on ws://localhost:8080");
