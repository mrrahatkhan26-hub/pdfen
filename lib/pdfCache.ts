const DB_NAME = "pdf_notes_local_cache";
const STORE_NAME = "pdfs";
const MAX_CACHE_BYTES = 300 * 1024 * 1024; // ~300 MB

interface CachedPdfEntry {
  docId: string;
  blob: Blob;
  size: number;
  updatedAt: number;
}

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "docId" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedPdf(docId: string): Promise<Blob | null> {
  const db = await openCacheDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(docId);
    req.onsuccess = () => {
      const entry = req.result as CachedPdfEntry | undefined;
      if (!entry) return resolve(null);
      entry.updatedAt = Date.now();
      store.put(entry);
      resolve(entry.blob);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveCachedPdf(docId: string, blob: Blob): Promise<void> {
  const db = await openCacheDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const all: CachedPdfEntry[] = await new Promise((resolve, reject) => {
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result as CachedPdfEntry[]);
    r.onerror = () => reject(r.error);
  });

  const filtered = all.filter((item) => item.docId !== docId);
  let totalSize = filtered.reduce((acc, item) => acc + item.size, 0) + blob.size;

  filtered.sort((a, b) => a.updatedAt - b.updatedAt);
  for (const old of filtered) {
    if (totalSize <= MAX_CACHE_BYTES) break;
    store.delete(old.docId);
    totalSize -= old.size;
  }

  store.put({
    docId,
    blob,
    size: blob.size,
    updatedAt: Date.now(),
  } satisfies CachedPdfEntry);
}
