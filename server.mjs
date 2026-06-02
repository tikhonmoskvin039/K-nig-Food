import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { WebSocket, WebSocketServer } from "ws";
import adminAuthCore from "./app/lib/adminAuthCore.js";

const {
  signAdminLoginToken,
  verifyAdminPassword,
} = adminAuthCore;

const productionStart =
  process.argv.includes("--production") || process.env.npm_lifecycle_event === "start";

if (productionStart && !process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const { default: next } = await import("next");
const dev = process.env.NODE_ENV !== "production";
const configuredHostname = process.env.HOSTNAME;
const displayHostname = configuredHostname || "localhost";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const app = next({
  dev,
  dir: process.cwd(),
  hostname: configuredHostname || "localhost",
  port,
  httpServer: {
    on() {},
  },
});
const prisma = new PrismaClient();
const authSocketPath = "/api/admin/auth/ws";
const maxLoginPayloadBytes = 8 * 1024;
const loginWindowMs = 60 * 1000;
const maxFailedAttempts = 8;
const failedAttempts = new Map();

function getClientAddress(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

function isRateLimited(address) {
  const now = Date.now();
  const entry = failedAttempts.get(address);

  if (!entry || entry.resetAt <= now) {
    failedAttempts.set(address, { count: 0, resetAt: now + loginWindowMs });
    return false;
  }

  return entry.count >= maxFailedAttempts;
}

function recordFailedAttempt(address) {
  const now = Date.now();
  const entry = failedAttempts.get(address);

  if (!entry || entry.resetAt <= now) {
    failedAttempts.set(address, { count: 1, resetAt: now + loginWindowMs });
    return;
  }

  entry.count += 1;
}

function clearFailedAttempts(address) {
  failedAttempts.delete(address);
}

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function closeSoon(socket) {
  setTimeout(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(1000);
    }
  }, 150);
}

function toMessageBuffer(rawMessage) {
  if (Buffer.isBuffer(rawMessage)) {
    return rawMessage;
  }

  if (Array.isArray(rawMessage)) {
    return Buffer.concat(rawMessage);
  }

  return Buffer.from(rawMessage);
}

async function handleLoginMessage(socket, req, rawMessage) {
  const address = getClientAddress(req);
  const messageBuffer = toMessageBuffer(rawMessage);

  if (messageBuffer.byteLength > maxLoginPayloadBytes) {
    sendJson(socket, {
      type: "admin.login.error",
      message: "Слишком большой запрос авторизации.",
    });
    closeSoon(socket);
    return;
  }

  if (isRateLimited(address)) {
    sendJson(socket, {
      type: "admin.login.error",
      message: "Слишком много попыток входа. Попробуйте позже.",
    });
    closeSoon(socket);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(messageBuffer.toString("utf8"));
  } catch {
    sendJson(socket, {
      type: "admin.login.error",
      message: "Некорректный запрос авторизации.",
    });
    closeSoon(socket);
    return;
  }

  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (payload.type !== "admin.login" || !username || !password) {
    sendJson(socket, {
      type: "admin.login.error",
      message: "Введите логин и пароль.",
    });
    closeSoon(socket);
    return;
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { username },
  });
  const passwordMatches = adminUser
    ? verifyAdminPassword(password, adminUser.passwordHash)
    : false;

  if (!passwordMatches) {
    recordFailedAttempt(address);
    sendJson(socket, {
      type: "admin.login.error",
      message: "Неверный логин или пароль.",
    });
    closeSoon(socket);
    return;
  }

  clearFailedAttempts(address);
  sendJson(socket, {
    type: "admin.login.ok",
    loginToken: signAdminLoginToken(adminUser.username),
  });
  closeSoon(socket);
}

await app.prepare();

const handleRequest = app.getRequestHandler();
const handleUpgrade = app.getUpgradeHandler();
const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error("NEXT REQUEST ERROR:", error);
    res.statusCode = 500;
    res.end("Internal server error");
  });
});
const authSocketServer = new WebSocketServer({ noServer: true });

authSocketServer.on("connection", (socket, req) => {
  socket.once("message", (rawMessage) => {
    handleLoginMessage(socket, req, rawMessage).catch((error) => {
      console.error("ADMIN WS LOGIN ERROR:", error);
      sendJson(socket, {
        type: "admin.login.error",
        message: "Не удалось выполнить вход.",
      });
      closeSoon(socket);
    });
  });
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === authSocketPath) {
    authSocketServer.handleUpgrade(req, socket, head, (webSocket) => {
      authSocketServer.emit("connection", webSocket, req);
    });
    return;
  }

  handleUpgrade(req, socket, head).catch((error) => {
    console.error("NEXT UPGRADE ERROR:", error);
    socket.destroy();
  });
});

const listenArgs = configuredHostname ? [port, configuredHostname] : [port];

server.listen(...listenArgs, () => {
  console.log(`K-nig Food ready on http://${displayHostname}:${port}`);
  console.log(`Admin auth WebSocket listening on ${authSocketPath}`);
});
