const CACHE_NAME = "kfood-pwa-v1";
const APP_SHELL_ASSETS = ["/", "/offline", "/manifest.json", "/placeholder.png"];
const OFFLINE_QUEUE_DB = "kfood-offline-queue";
const OFFLINE_QUEUE_STORE = "requests";
const OFFLINE_QUEUE_DB_VERSION = 1;

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function reconstructQueuedBody(body) {
  if (!body || body.kind === "none") return undefined;

  if (body.kind === "text") {
    return body.value || undefined;
  }

  const formData = new FormData();

  for (const entry of body.entries || []) {
    if (entry.type === "text") {
      formData.append(entry.key, entry.value);
      continue;
    }

    const bytes = base64ToUint8Array(entry.dataBase64);
    const blob = new Blob([bytes], {
      type: entry.mimeType || "application/octet-stream",
    });
    formData.append(entry.key, blob, entry.name || "file");
  }

  return formData;
}

function prepareReplayHeaders(headers, body) {
  const nextHeaders = { ...(headers || {}) };

  if (body && body.kind === "form-data") {
    delete nextHeaders["content-type"];
    delete nextHeaders["Content-Type"];
  }

  return nextHeaders;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB request failed"));
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted"));
  });
}

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE_DB, OFFLINE_QUEUE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        const store = db.createObjectStore(OFFLINE_QUEUE_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("byCreatedAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Failed to open queue database"));
  });
}

async function readQueuedRequests(db) {
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readonly");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  const rows = await requestToPromise(store.getAll());
  await transactionToPromise(tx);
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

async function deleteQueuedRequest(db, id) {
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  await requestToPromise(store.delete(id));
  await transactionToPromise(tx);
}

async function updateQueuedRequest(db, record) {
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  await requestToPromise(store.put(record));
  await transactionToPromise(tx);
}

async function flushQueuedRequestsInServiceWorker() {
  const db = await openQueueDb();
  const queuedRequests = await readQueuedRequests(db);

  let sent = 0;
  let failed = 0;

  for (const request of queuedRequests) {
    if (request.id === undefined) continue;

    try {
      const replayBody = await reconstructQueuedBody(request.body);
      const replayHeaders = prepareReplayHeaders(request.headers, request.body);

      const response = await fetch(request.url, {
        method: request.method,
        headers: replayHeaders,
        body: replayBody,
        credentials: request.credentials || "same-origin",
      });

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        await deleteQueuedRequest(db, request.id);
        sent += 1;
      } else {
        request.retries = Number(request.retries || 0) + 1;
        await updateQueuedRequest(db, request);
        failed += 1;
      }
    } catch {
      request.retries = Number(request.retries || 0) + 1;
      await updateQueuedRequest(db, request);
      failed += 1;
    }
  }

  return { sent, failed };
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  clients.forEach((client) => {
    client.postMessage(payload);
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          return (await caches.match(request)) || (await caches.match("/offline"));
        }
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      const networkResponsePromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || (await networkResponsePromise) || Response.error();
    })(),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "kfood-offline-sync") return;

  event.waitUntil(
    flushQueuedRequestsInServiceWorker()
      .then((result) =>
        notifyClients({
          type: "OFFLINE_SYNC_RESULT",
          payload: result,
        }),
      )
      .catch(() => notifyClients({ type: "OFFLINE_SYNC" })),
  );
});
