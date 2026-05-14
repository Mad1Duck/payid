/// <reference lib="dom" />

/**
 * Offline-First Cache for PAY.ID SDK
 *
 * Stores rule configs, contact book, and draft payments in IndexedDB.
 * Enables offline browsing and draft creation — syncs when online.
 * NOTE: Browser-only. IndexedDB APIs are not available in Node.js.
 */

const DB_NAME = "PayIDCache";
const DB_VERSION = 1;

const STORES = {
  RULES: "rules",
  CONTACTS: "contacts",
  DRAFTS: "drafts",
  HISTORY: "history",
} as const;

export type CacheStore = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Rules: key = IPFS CID / hash
      if (!db.objectStoreNames.contains(STORES.RULES)) {
        const store = db.createObjectStore(STORES.RULES, { keyPath: "key" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Contacts: key = payId
      if (!db.objectStoreNames.contains(STORES.CONTACTS)) {
        const store = db.createObjectStore(STORES.CONTACTS, { keyPath: "payId" });
        store.createIndex("address", "address", { unique: false });
        store.createIndex("name", "name", { unique: false });
      }

      // Drafts: key = auto-increment
      if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
        const store = db.createObjectStore(STORES.DRAFTS, { keyPath: "id", autoIncrement: true });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      // History: key = txHash
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        const store = db.createObjectStore(STORES.HISTORY, { keyPath: "txHash" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });

  return dbPromise;
}

// ─── Generic CRUD ────────────────────────────────────────────────────────────

async function get<T>(store: CacheStore, key: IDBValidKey): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const objectStore = tx.objectStore(store);
      const req = objectStore.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function set<T extends Record<string, unknown>>(
  store: CacheStore,
  value: T & { key: string; }
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const objectStore = tx.objectStore(store);
      const req = objectStore.put(value);
      req.onsuccess = () => resolve(undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IndexedDB unavailable → silently fail
  }
}

async function remove(store: CacheStore, key: IDBValidKey): Promise<void> {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const objectStore = tx.objectStore(store);
      const req = objectStore.delete(key);
      req.onsuccess = () => resolve(undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Silently fail
  }
}

async function getAll<T>(store: CacheStore): Promise<T[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const objectStore = tx.objectStore(store);
      const req = objectStore.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function getAllByIndex<T>(
  store: CacheStore,
  indexName: string,
  query?: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const objectStore = tx.objectStore(store);
      const index = objectStore.index(indexName);
      const req = index.getAll(query);
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// ─── Rules Cache ─────────────────────────────────────────────────────────────

export interface CachedRule {
  key: string; // IPFS CID or hash
  config: Record<string, unknown>;
  timestamp: number;
  sourceUri: string;
  sizeBytes: number;
}

export const ruleCache = {
  get: (key: string) => get<CachedRule>(STORES.RULES, key),
  set: (value: CachedRule) => set(STORES.RULES, value as unknown as Record<string, unknown> & { key: string; }),
  delete: (key: string) => remove(STORES.RULES, key),
  getAll: () => getAll<CachedRule>(STORES.RULES),
  clear: async () => {
    const all = await getAll<CachedRule>(STORES.RULES);
    await Promise.all(all.map((r) => remove(STORES.RULES, r.key)));
  },
};

// ─── Contacts Cache ──────────────────────────────────────────────────────────

export interface CachedContact {
  payId: string;
  address: string;
  name: string;
  avatar?: string;
  addedAt: number;
  note?: string;
  reputation?: number;
  isBlacklisted?: boolean;
}

export const contactCache = {
  get: (payId: string) => get<CachedContact>(STORES.CONTACTS, payId),
  set: (value: CachedContact) => set(STORES.CONTACTS, { ...value, key: value.payId }),
  delete: (payId: string) => remove(STORES.CONTACTS, payId),
  getAll: () => getAll<CachedContact>(STORES.CONTACTS),
  findByAddress: (address: string) =>
    getAllByIndex<CachedContact>(STORES.CONTACTS, "address", address.toLowerCase()),
  findByName: (name: string) =>
    getAllByIndex<CachedContact>(STORES.CONTACTS, "name", name),
};

// ─── Draft Payments Cache ────────────────────────────────────────────────────

export type DraftStatus = "draft" | "queued" | "syncing" | "sent" | "failed";

export interface DraftPayment {
  id?: number;
  toPayId: string;
  toAddress?: string;
  amount: string;
  asset: string;
  note?: string;
  status: DraftStatus;
  createdAt: number;
  updatedAt: number;
  proofHash?: string;
  txHash?: string;
  error?: string;
}

export const draftCache = {
  get: (id: number) => get<DraftPayment>(STORES.DRAFTS, id),
  set: async (value: DraftPayment) => {
    const entry = { ...value, key: String(value.id ?? Date.now()) };
    await set(STORES.DRAFTS, entry as any);
  },
  delete: (id: number) => remove(STORES.DRAFTS, id),
  getAll: () => getAll<DraftPayment>(STORES.DRAFTS),
  getPending: () => getAllByIndex<DraftPayment>(STORES.DRAFTS, "status", "queued"),
  getFailed: () => getAllByIndex<DraftPayment>(STORES.DRAFTS, "status", "failed"),
};

// ─── History Cache ───────────────────────────────────────────────────────────

export interface CachedTx {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  payId?: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  fee?: string;
  blockNumber?: number;
}

export const historyCache = {
  get: (txHash: string) => get<CachedTx>(STORES.HISTORY, txHash),
  set: (value: CachedTx) => set(STORES.HISTORY, { ...value, key: value.txHash }),
  delete: (txHash: string) => remove(STORES.HISTORY, txHash),
  getAll: () => getAll<CachedTx>(STORES.HISTORY),
};

// ─── Cache Manager ───────────────────────────────────────────────────────────

export interface CacheStats {
  rules: number;
  contacts: number;
  drafts: number;
  history: number;
  totalSizeEstimate: number;
}

export async function getCacheStats(): Promise<CacheStats> {
  const [rules, contacts, drafts, history] = await Promise.all([
    ruleCache.getAll(),
    contactCache.getAll(),
    draftCache.getAll(),
    historyCache.getAll(),
  ]);

  const totalSizeEstimate =
    JSON.stringify(rules).length +
    JSON.stringify(contacts).length +
    JSON.stringify(drafts).length +
    JSON.stringify(history).length;

  return {
    rules: rules.length,
    contacts: contacts.length,
    drafts: drafts.length,
    history: history.length,
    totalSizeEstimate,
  };
}

export async function clearAllCache(): Promise<void> {
  await Promise.all([
    ruleCache.clear(),
    contactCache.getAll().then((all) =>
      Promise.all(all.map((c) => contactCache.delete(c.payId)))
    ),
    draftCache.getAll().then((all) =>
      Promise.all(all.map((d) => draftCache.delete(d.id!)))
    ),
    historyCache.getAll().then((all) =>
      Promise.all(all.map((h) => historyCache.delete(h.txHash)))
    ),
  ]);
}
