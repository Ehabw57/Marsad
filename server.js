const http = require("http");
const fs = require("fs");
const path = require("path");
const Websocket = require("ws");
const dotenv = require("dotenv");
const uuid = require("uuid");
const store = {};

dotenv.config();

const serverURL = process.env.SERVERURL || "http://localhost:8080";

const server = http.createServer((req, res) => {
  const reqPath = path.join(
    __dirname,
    req.url === "/" ? "index.html" : req.url,
  );

  if (!req.headers.cookie || !req.headers.cookie.includes("client-id")) {
    const cookie = [
      `client-id=${uuid.v4()}`,
      "HttpOnly",
      "Max-Age=31536000",
    ].join("; ");

    res.setHeader("Set-Cookie", cookie);
  }

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
      svg: "image/svg+xml",
      js: "application/javascript",
    };

    if (!process.env.SERVERURL) {
      console.warn(
        "Warning: SERVERURL is not defined in environment variables.",
      );
      process.env.SERVERURL = "http://localhost:8080";
    }

    if (req.url === "/" || req.url === "/index.html")
      data = data.toString().replace(/__SERVER_URL__/g, process.env.SERVERURL);

    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.writeHead(200);
    res.end(data);
  });
});

const wss = new Websocket.Server({ server });

function calculateUnderstanding() {
  let result = { count: 0, red: 0, yellow: 0, green: 0 };
  Object.values(store).forEach((item) => {
    if (item.state === "green") result.green++;
    if (item.state === "red") result.red++;
    if (item.state === "yellow") result.yellow++;
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

wss.on("connection", (ws, req) => {
  const cookie = req.headers.cookie.split(";")
  const clientId = cookie ? cookie.find((c) => c.trim().startsWith("client-id=")).split("=")[1] : uuid.v4();
  console.log("New client connected:", clientId);
  ws.id = clientId;
  if (!store[clientId]) {
    store[clientId] = { state: "green", numberOfClients: 1 };
    broadcastUnderstanding();
  } else {
    store[clientId].numberOfClients += 1;

    ws.send(JSON.stringify(calculateUnderstanding()));
  }

  ws.on("message", (message) => {
    if (!message) return;
    store[ws.id].state = message.toString();
    broadcastUnderstanding();
  });

  ws.on("close", () => {
    const numberOfClients = store[ws.id].numberOfClients - 1;
    if (numberOfClients === 0) {
      delete store[ws.id];
      broadcastUnderstanding();
    } else {
      store[ws.id].numberOfClients = numberOfClients;
      console.log(`Client instance disconnected: ${ws.id} remaining instances: ${numberOfClients}`);
    }
  });
});

server.listen(8080, () => {
  console.log(
    `WebSocket server is running on ${serverURL.replace("http", "ws")}`,
  );
  console.log(`server is running on ${serverURL}`);
});
