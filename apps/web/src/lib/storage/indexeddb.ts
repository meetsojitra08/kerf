export interface PartInfo {
  partNumber: number;
  etag: string;
  size: number;
}

export interface UploadRecord {
  uploadId: string;
  projectId: string;
  filename: string;
  size: number;
  mtime: number;
  fingerprint: string;
  partSize: number;
  totalParts: number;
  completedParts: PartInfo[];
  status: 'uploading' | 'paused' | 'completed' | 'aborted' | 'error';
  createdAt: number;
  updatedAt: number;
  fileHandle?: FileSystemFileHandle;
}

const DB_NAME = 'kerf_uploads_db';
const DB_VERSION = 1;
const STORE_NAME = 'uploads';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'uploadId' });
        store.createIndex('fingerprint', 'fingerprint', { unique: false });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveUploadRecord(record: UploadRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const updated = { ...record, updatedAt: Date.now() };
    const req = store.put(updated);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getUploadRecord(uploadId: string): Promise<UploadRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(uploadId);

    req.onsuccess = () => resolve((req.result as UploadRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getUploadRecordByFingerprint(fingerprint: string): Promise<UploadRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('fingerprint');
    const req = index.get(fingerprint);

    req.onsuccess = () => resolve((req.result as UploadRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllIncompleteUploads(): Promise<UploadRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const records = (req.result as UploadRecord[]) || [];
      resolve(records.filter((r) => r.status === 'uploading' || r.status === 'paused'));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteUploadRecord(uploadId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(uploadId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
