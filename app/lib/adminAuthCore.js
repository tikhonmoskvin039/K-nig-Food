/* eslint-disable @typescript-eslint/no-require-imports */
const { createHmac, randomBytes, scryptSync, timingSafeEqual } = require("crypto");

const ADMIN_SESSION_COOKIE = "knig_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const ADMIN_LOGIN_TOKEN_TTL_SECONDS = 60;
const DEV_ADMIN_AUTH_SECRET = "knig-food-dev-admin-auth-secret";
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function getAdminAuthSecret() {
  const configuredSecret = process.env.ADMIN_AUTH_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_ADMIN_AUTH_SECRET;
  }

  throw new Error("ADMIN_AUTH_SECRET is required in production.");
}

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url");
}

function safeCompare(value, expectedValue) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expectedValue);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function hashAdminPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH, PASSWORD_PARAMS);

  return [
    "scrypt",
    String(PASSWORD_PARAMS.N),
    String(PASSWORD_PARAMS.r),
    String(PASSWORD_PARAMS.p),
    salt,
    hash.toString("base64url"),
  ].join("$");
}

function verifyAdminPassword(password, storedHash) {
  if (!password || !storedHash) {
    return false;
  }

  const [algorithm, rawN, rawR, rawP, salt, rawHash] = storedHash.split("$");

  if (algorithm !== "scrypt" || !rawN || !rawR || !rawP || !salt || !rawHash) {
    return false;
  }

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  const hashBuffer = base64UrlDecode(rawHash);

  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const candidateHash = scryptSync(password, salt, hashBuffer.length, {
    N,
    r,
    p,
    maxmem: PASSWORD_PARAMS.maxmem,
  });

  return timingSafeEqual(candidateHash, hashBuffer);
}

function signAdminPayload(payload, ttlSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = createHmac("sha256", getAdminAuthSecret())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

function verifyAdminPayload(token, expectedType) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getAdminAuthSecret())
    .update(body)
    .digest("base64url");

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(body).toString("utf8"));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    !payload ||
    payload.type !== expectedType ||
    typeof payload.sub !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp < now
  ) {
    return null;
  }

  return payload;
}

function signAdminSessionToken(username) {
  return signAdminPayload(
    {
      type: "admin-session",
      sub: username,
    },
    ADMIN_SESSION_TTL_SECONDS,
  );
}

function verifyAdminSessionToken(token) {
  return verifyAdminPayload(token, "admin-session");
}

function signAdminLoginToken(username) {
  return signAdminPayload(
    {
      type: "admin-login",
      sub: username,
      jti: randomBytes(16).toString("base64url"),
    },
    ADMIN_LOGIN_TOKEN_TTL_SECONDS,
  );
}

function verifyAdminLoginToken(token) {
  return verifyAdminPayload(token, "admin-login");
}

function isLikelyStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 16 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

function randomChar(alphabet) {
  const index = randomBytes(1)[0] % alphabet.length;
  return alphabet[index];
}

function shuffle(value) {
  const chars = value.split("");

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomBytes(1)[0] % (index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join("");
}

function generateAdminPassword(length = 24) {
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^*()-_=+[]{}.?";
  const alphabet = lowercase + uppercase + digits + symbols;

  let password =
    randomChar(lowercase) +
    randomChar(uppercase) +
    randomChar(digits) +
    randomChar(symbols);

  while (password.length < length) {
    password += randomChar(alphabet);
  }

  return shuffle(password);
}

module.exports = {
  ADMIN_LOGIN_TOKEN_TTL_SECONDS,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  generateAdminPassword,
  getAdminAuthSecret,
  hashAdminPassword,
  isLikelyStrongPassword,
  signAdminLoginToken,
  signAdminSessionToken,
  verifyAdminLoginToken,
  verifyAdminPassword,
  verifyAdminSessionToken,
};
