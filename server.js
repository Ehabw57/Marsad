const http = require("http");
const fs = require("fs");
const path = require("path");
const Websocket = require("ws");
const dotenv = require("dotenv");
const uuid = require("uuid");
const store = {};

dotenv.config();

const server = http.createServer((req, res) => {
  const reqPath = path.join(
    __dirname,
    req.url === "/" ? "index.html" : req.url,
  );
  fs.readFile(reqPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = reqPath.split(".").pop();
    const mimeTypes = {
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
    };

    if (req.url === "/" || req.url === "/index.html")
      data = data
        .toString()
        .replace(
          /__SERVER_URL__/g,
          process.env.SERVERURL || "http://localhost:8080",
        );

    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.writeHead(200);
    res.end(data);
  });
});

const wss = new Websocket.Server({ server });

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

server.listen(8080, () => {
  console.log("WebSocket server is running on ws://localhost:8080");
  console.log("server is running on http://localhost:8080");
});
