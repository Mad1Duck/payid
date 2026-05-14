import { useState, useEffect, useCallback } from 'react';

// Browser-only IndexedDB cache wrapper for React hooks
// The actual SDK core cache lives in payid (sdk-core), but we re-export
// browser-safe operations here for the React layer.

export interface CacheStats {
  rules: number;
  contacts: number;
  drafts: number;
  history: number;
}

export interface DraftPayment {
  id?: number;
  toPayId: string;
  toAddress?: string;
  amount: string;
  asset: string;
  note?: string;
  status: 'draft' | 'queued' | 'syncing' | 'sent' | 'failed';
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'PayIDCache';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('drafts')) {
        const store = db.createObjectStore('drafts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('contacts')) {
        const store = db.createObjectStore('contacts', { keyPath: 'payId' });
        store.createIndex('address', 'address', { unique: false });
      }
      if (!db.objectStoreNames.contains('rules')) {
        db.createObjectStore('rules', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'txHash' });
      }
    };
  });
}

async function getStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * React hook for offline cache stats and draft payments.
 *
 * @example
 * ```tsx
 * const { stats, drafts, addDraft, deleteDraft, isReady } = useOfflineCache();
 * ```
 */
export function useOfflineCache() {
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<CacheStats>({ rules: 0, contacts: 0, drafts: 0, history: 0 });
  const [drafts, setDrafts] = useState<DraftPayment[]>([]);

  const refresh = useCallback(async () => {
    const [draftList, contactList, ruleList, historyList] = await Promise.all([
      getStore<DraftPayment>('drafts'),
      getStore<{ payId: string }>('contacts'),
      getStore<{ key: string }>('rules'),
      getStore<{ txHash: string }>('history'),
    ]);

    setDrafts(draftList);
    setStats({
      rules: ruleList.length,
      contacts: contactList.length,
      drafts: draftList.length,
      history: historyList.length,
    });
    setIsReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDraft = useCallback(async (draft: Omit<DraftPayment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('drafts', 'readwrite');
        const store = tx.objectStore('drafts');
        const entry = {
          ...draft,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      await refresh();
    } catch {
      // IndexedDB unavailable — ignore
    }
  }, [refresh]);

  const deleteDraft = useCallback(async (id: number) => {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('drafts', 'readwrite');
        const store = tx.objectStore('drafts');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      await refresh();
    } catch {
      // Ignore
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    try {
      const db = await openDB();
      await Promise.all(
        ['drafts', 'contacts', 'rules', 'history'].map(
          (storeName) =>
            new Promise<void>((resolve, reject) => {
              const tx = db.transaction(storeName, 'readwrite');
              const store = tx.objectStore(storeName);
              const req = store.clear();
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            })
        )
      );
      await refresh();
    } catch {
      // Ignore
    }
  }, [refresh]);

  return { isReady, stats, drafts, addDraft, deleteDraft, clearAll, refresh };
}
