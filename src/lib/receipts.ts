import type { ReceiptMeta } from "../data/types";

/**
 * Receipts live in IndexedDB in the browser on this machine only. Nothing is uploaded
 * anywhere and nothing reaches the repository — the export below is the only way a
 * receipt leaves the browser.
 */
const DB_NAME = "bayit-receipts";
const STORE = "files";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

interface StoredReceipt extends ReceiptMeta {
  blob: Blob;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function addReceipt(
  file: File,
  meta: Partial<Pick<ReceiptMeta, "expenseId" | "categoryId" | "amount">> = {}
): Promise<ReceiptMeta> {
  const record: StoredReceipt = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
    ...meta,
  };
  await tx("readwrite", (s) => s.put(record));
  const { blob: _blob, ...rest } = record;
  return rest;
}

export async function listReceipts(): Promise<ReceiptMeta[]> {
  const all = await tx<StoredReceipt[]>("readonly", (s) => s.getAll());
  return all
    .map(({ blob: _blob, ...rest }) => rest)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function getReceiptBlob(id: string): Promise<Blob | null> {
  const rec = await tx<StoredReceipt | undefined>("readonly", (s) => s.get(id));
  return rec?.blob ?? null;
}

export async function updateReceipt(id: string, patch: Partial<ReceiptMeta>) {
  const rec = await tx<StoredReceipt | undefined>("readonly", (s) => s.get(id));
  if (!rec) return;
  await tx("readwrite", (s) => s.put({ ...rec, ...patch, id }));
}

export async function deleteReceipt(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

/** Asks the browser to keep this origin's data out of automatic eviction. */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
