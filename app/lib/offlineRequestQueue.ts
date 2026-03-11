"use client";

type QueueableMethod = "POST" | "PUT" | "PATCH" | "DELETE";

type SerializedFormDataEntry =
  | {
      key: string;
      type: "text";
      value: string;
    }
  | {
      key: string;
      type: "file";
      name: string;
      mimeType: string;
      lastModified: number;
      dataBase64: string;
    };

type QueuedRequestBody =
  | { kind: "none" }
  | { kind: "text"; value: string | null }
  | { kind: "form-data"; entries: SerializedFormDataEntry[] };

export type OfflineQueueQueuedDetail = {
  url: string;
  method: QueueableMethod;
  queueSize: number;
};

export type OfflineQueueFlushedDetail = {
  sent: number;
  failed: number;
  remaining: number;
};

type QueuedRequestRecord = {
  id?: number;
  url: string;
  method: QueueableMethod;
  headers: Record<string, string>;
  body: QueuedRequestBody;
  credentials: RequestCredentials;
  createdAt: number;
  retries: number;
  idempotencyKey: string | null;
};

type QueuedRequestPlan = {
  record: QueuedRequestRecord;
  fetchInit: RequestInit;
};

declare global {
  interface WindowEventMap {
    "offline-queue:queued": CustomEvent<OfflineQueueQueuedDetail>;
    "offline-queue:flushed": CustomEvent<OfflineQueueFlushedDetail>;
  }
}

const OFFLINE_QUEUE_DB = "kfood-offline-queue";
const OFFLINE_QUEUE_STORE = "requests";
const OFFLINE_QUEUE_DB_VERSION = 1;
const OFFLINE_QUEUED_HEADER = "x-offline-queued";
const OFFLINE_QUEUE_DIRECTIVE_HEADER = "x-offline-queue";
const IDEMPOTENCY_HEADER = "x-idempotency-key";

const QUEUEABLE_METHODS = new Set<QueueableMethod>([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

let dbPromise: Promise<IDBDatabase> | null = null;
let fetchProxyInstalled = false;
let nativeFetch: typeof window.fetch | null = null;
let flushInFlight: Promise<OfflineQueueFlushedDetail> | null = null;

function createQueuedResponse(idempotencyKey: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json",
    [OFFLINE_QUEUED_HEADER]: "1",
  });

  if (idempotencyKey) {
    headers.set(IDEMPOTENCY_HEADER, idempotencyKey);
  }

  return new Response(
    JSON.stringify({
      queued: true,
      message: "Request queued until network connection is restored.",
    }),
    {
      status: 202,
      headers,
    },
  );
}

function isQueueableMethod(method: string): method is QueueableMethod {
  return QUEUEABLE_METHODS.has(method as QueueableMethod);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function getQueueDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      OFFLINE_QUEUE_DB,
      OFFLINE_QUEUE_DB_VERSION,
    );

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
      reject(request.error ?? new Error("Failed to open offline queue DB"));
  });

  return dbPromise;
}

async function addQueuedRequest(record: QueuedRequestRecord): Promise<number> {
  const db = await getQueueDatabase();
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  const requestId = await requestToPromise(store.add(record));
  await transactionToPromise(tx);
  return Number(requestId);
}

async function getQueuedRequests(): Promise<QueuedRequestRecord[]> {
  const db = await getQueueDatabase();
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readonly");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  const rows = await requestToPromise(store.getAll());
  await transactionToPromise(tx);
  return rows
    .map((row) => row as QueuedRequestRecord)
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function removeQueuedRequest(id: number): Promise<void> {
  const db = await getQueueDatabase();
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  await requestToPromise(store.delete(id));
  await transactionToPromise(tx);
}

async function updateQueuedRequest(record: QueuedRequestRecord): Promise<void> {
  if (record.id === undefined) return;

  const db = await getQueueDatabase();
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  await requestToPromise(store.put(record));
  await transactionToPromise(tx);
}

async function getQueueSize(): Promise<number> {
  const db = await getQueueDatabase();
  const tx = db.transaction(OFFLINE_QUEUE_STORE, "readonly");
  const store = tx.objectStore(OFFLINE_QUEUE_STORE);
  const count = await requestToPromise(store.count());
  await transactionToPromise(tx);
  return Number(count);
}

function resolveInputUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getCombinedHeaders(
  input: RequestInfo | URL,
  init?: RequestInit,
): Headers {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);

  if (init?.headers) {
    const initHeaders = new Headers(init.headers);
    initHeaders.forEach((value, key) => headers.set(key, value));
  }

  return headers;
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!);
  }

  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function serializeFormData(
  formData: FormData,
): Promise<SerializedFormDataEntry[]> {
  const entries: SerializedFormDataEntry[] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      entries.push({
        key,
        type: "text",
        value,
      });
      continue;
    }

    entries.push({
      key,
      type: "file",
      name: value.name || "file",
      mimeType: value.type || "application/octet-stream",
      lastModified: value.lastModified || Date.now(),
      dataBase64: await blobToBase64(value),
    });
  }

  return entries;
}

async function serializeBodyFromInit(
  body: BodyInit,
  headers: Headers,
): Promise<{ supported: boolean; body: QueuedRequestBody }> {
  if (typeof body === "string") {
    return { supported: true, body: { kind: "text", value: body } };
  }

  if (body instanceof URLSearchParams) {
    if (!headers.has("content-type")) {
      headers.set(
        "content-type",
        "application/x-www-form-urlencoded;charset=UTF-8",
      );
    }
    return { supported: true, body: { kind: "text", value: body.toString() } };
  }

  if (body instanceof FormData) {
    return {
      supported: true,
      body: {
        kind: "form-data",
        entries: await serializeFormData(body),
      },
    };
  }

  return { supported: false, body: { kind: "none" } };
}

async function serializeQueueBody(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  headers: Headers,
): Promise<{ supported: boolean; body: QueuedRequestBody }> {
  if (init?.body !== undefined && init.body !== null) {
    return serializeBodyFromInit(init.body, headers);
  }

  if (!(input instanceof Request)) {
    return { supported: true, body: { kind: "none" } };
  }

  const requestClone = input.clone();
  const contentType = (
    headers.get("content-type") ||
    requestClone.headers.get("content-type") ||
    ""
  ).toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await requestClone.formData();
      return {
        supported: true,
        body: {
          kind: "form-data",
          entries: await serializeFormData(formData),
        },
      };
    } catch {
      return { supported: false, body: { kind: "none" } };
    }
  }

  if (contentType.includes("application/octet-stream") || contentType.startsWith("image/")) {
    return { supported: false, body: { kind: "none" } };
  }

  const canSerializeAsText =
    contentType === "" ||
    contentType.includes("application/json") ||
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("text/");

  if (!canSerializeAsText) {
    return { supported: false, body: { kind: "none" } };
  }

  try {
    const text = await requestClone.text();
    return { supported: true, body: { kind: "text", value: text || null } };
  } catch {
    return { supported: false, body: { kind: "none" } };
  }
}

async function buildQueuedRequestPlan(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<QueuedRequestPlan | null> {
  if (typeof window === "undefined") return null;

  const rawUrl = resolveInputUrl(input);
  const absoluteUrl = new URL(rawUrl, window.location.origin);

  if (absoluteUrl.origin !== window.location.origin) return null;
  if (!absoluteUrl.pathname.startsWith("/api/")) return null;

  const method = (init?.method ?? (input instanceof Request ? input.method : "GET"))
    .toUpperCase()
    .trim();

  if (!isQueueableMethod(method)) return null;

  const headers = getCombinedHeaders(input, init);
  const queueDirective = headers.get(OFFLINE_QUEUE_DIRECTIVE_HEADER);

  if (queueDirective?.toLowerCase() === "skip") {
    return null;
  }

  headers.delete(OFFLINE_QUEUE_DIRECTIVE_HEADER);

  let idempotencyKey = headers.get(IDEMPOTENCY_HEADER);
  if (method === "POST" && !idempotencyKey) {
    idempotencyKey = createIdempotencyKey();
    headers.set(IDEMPOTENCY_HEADER, idempotencyKey);
  }

  const serializedBody = await serializeQueueBody(input, init, headers);
  if (!serializedBody.supported) return null;

  const normalizedHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    normalizedHeaders[key] = value;
  });

  const credentials =
    init?.credentials ??
    (input instanceof Request ? input.credentials : "same-origin");

  const fetchInit: RequestInit = {
    ...init,
    method,
    headers: normalizedHeaders,
    credentials,
  };

  return {
    record: {
      url: `${absoluteUrl.pathname}${absoluteUrl.search}`,
      method,
      headers: normalizedHeaders,
      body: serializedBody.body,
      credentials,
      createdAt: Date.now(),
      retries: 0,
      idempotencyKey: idempotencyKey || null,
    },
    fetchInit,
  };
}

async function reconstructBody(body: QueuedRequestBody): Promise<BodyInit | undefined> {
  if (body.kind === "none") return undefined;

  if (body.kind === "text") {
    return body.value ?? undefined;
  }

  const formData = new FormData();

  for (const entry of body.entries) {
    if (entry.type === "text") {
      formData.append(entry.key, entry.value);
      continue;
    }

    const bytes = base64ToUint8Array(entry.dataBase64);
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], { type: entry.mimeType });
    formData.append(entry.key, blob, entry.name);
  }

  return formData;
}

function prepareHeadersForReplay(
  headers: Record<string, string>,
  body: QueuedRequestBody,
): Record<string, string> {
  const nextHeaders = { ...headers };

  if (body.kind === "form-data") {
    delete nextHeaders["content-type"];
    delete nextHeaders["Content-Type"];
  }

  return nextHeaders;
}

function dispatchQueuedEvent(detail: OfflineQueueQueuedDetail) {
  window.dispatchEvent(
    new CustomEvent<OfflineQueueQueuedDetail>("offline-queue:queued", {
      detail,
    }),
  );
}

function dispatchFlushedEvent(detail: OfflineQueueFlushedDetail) {
  window.dispatchEvent(
    new CustomEvent<OfflineQueueFlushedDetail>("offline-queue:flushed", {
      detail,
    }),
  );
}

function isManualAbort(error: unknown, init?: RequestInit): boolean {
  if (init?.signal?.aborted) return true;

  return (
    error instanceof DOMException &&
    error.name === "AbortError" &&
    Boolean(init?.signal)
  );
}

export function isOfflineQueuedResponse(response: Response): boolean {
  return response.headers.get(OFFLINE_QUEUED_HEADER) === "1";
}

export function installOfflineFetchQueue() {
  if (typeof window === "undefined" || fetchProxyInstalled) return;
  if (!("indexedDB" in window)) return;

  nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const queuedPlan = await buildQueuedRequestPlan(input, init);

    if (!queuedPlan) {
      return nativeFetch!(input, init);
    }

    if (!navigator.onLine) {
      await addQueuedRequest(queuedPlan.record);
      const queueSize = await getQueueSize();
      dispatchQueuedEvent({
        url: queuedPlan.record.url,
        method: queuedPlan.record.method,
        queueSize,
      });
      return createQueuedResponse(queuedPlan.record.idempotencyKey);
    }

    try {
      return await nativeFetch!(input, queuedPlan.fetchInit);
    } catch (error) {
      if (isManualAbort(error, init)) {
        throw error;
      }

      await addQueuedRequest(queuedPlan.record);
      const queueSize = await getQueueSize();
      dispatchQueuedEvent({
        url: queuedPlan.record.url,
        method: queuedPlan.record.method,
        queueSize,
      });
      return createQueuedResponse(queuedPlan.record.idempotencyKey);
    }
  };

  fetchProxyInstalled = true;
}

async function flushOfflineQueueInternal(): Promise<OfflineQueueFlushedDetail> {
  if (typeof window === "undefined") {
    return { sent: 0, failed: 0, remaining: 0 };
  }

  if (!nativeFetch) {
    nativeFetch = window.fetch.bind(window);
  }

  if (!navigator.onLine) {
    const remaining = await getQueueSize().catch(() => 0);
    return { sent: 0, failed: 0, remaining };
  }

  const queuedRequests = await getQueuedRequests();
  let sent = 0;
  let failed = 0;

  for (const request of queuedRequests) {
    if (!navigator.onLine) break;

    try {
      const replayBody = await reconstructBody(request.body);
      const replayHeaders = prepareHeadersForReplay(request.headers, request.body);

      const response = await nativeFetch!(request.url, {
        method: request.method,
        headers: replayHeaders,
        body: replayBody,
        credentials: request.credentials,
      });

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        if (request.id !== undefined) {
          await removeQueuedRequest(request.id);
        }
        sent += 1;
      } else {
        request.retries += 1;
        await updateQueuedRequest(request);
        failed += 1;
      }
    } catch {
      request.retries += 1;
      await updateQueuedRequest(request);
      failed += 1;

      if (!navigator.onLine) break;
    }
  }

  const remaining = await getQueueSize().catch(() => 0);
  const detail: OfflineQueueFlushedDetail = { sent, failed, remaining };

  if (sent > 0 || failed > 0) {
    dispatchFlushedEvent(detail);
  }

  return detail;
}

export async function flushOfflineQueue(): Promise<OfflineQueueFlushedDetail> {
  if (flushInFlight) {
    return flushInFlight;
  }

  flushInFlight = flushOfflineQueueInternal().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}
