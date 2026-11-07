import {
  deleteUploadRecord,
  getAllIncompleteUploads,
  getUploadRecord,
  getUploadRecordByFingerprint,
  saveUploadRecord,
  UploadRecord,
  PartInfo,
} from '../storage/indexeddb';
import { computeFileFingerprint } from './fingerprint';

export interface UploadProgressEvent {
  uploadId: string;
  bytesUploaded: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
  percent: number;
}

export interface UploadCompleteEvent {
  uploadId: string;
  assetId: string;
  status: string;
}

export type ProgressListener = (event: UploadProgressEvent) => void;
export type CompleteListener = (event: UploadCompleteEvent) => void;
export type ErrorListener = (uploadId: string, error: string) => void;

export class KerfUploader {
  private apiBaseUrl: string;
  private getToken: () => string | null;
  private activeWorkers = new Map<string, Worker>();
  private progressListeners = new Set<ProgressListener>();
  private completeListeners = new Set<CompleteListener>();
  private errorListeners = new Set<ErrorListener>();

  constructor(apiBaseUrl: string = 'http://localhost:8000', getToken: () => string | null = () => null) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    this.getToken = getToken;
  }

  public onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  public onComplete(listener: CompleteListener): () => void {
    this.completeListeners.add(listener);
    return () => this.completeListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public async getPendingUploads(): Promise<UploadRecord[]> {
    return getAllIncompleteUploads();
  }

  public async startUpload(
    file: File,
    projectId: string,
    idempotencyKey?: string,
    fileHandle?: FileSystemFileHandle
  ): Promise<string> {
    const fingerprint = await computeFileFingerprint(file);

    // Check if we already have an unfinished upload for this file
    const existing = await getUploadRecordByFingerprint(fingerprint);
    if (existing && (existing.status === 'uploading' || existing.status === 'paused')) {
      await this.resumeUpload(file, existing.uploadId);
      return existing.uploadId;
    }

    // Call server to initiate multipart upload
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const initResp = await fetch(`${this.apiBaseUrl}/v1/projects/${projectId}/assets/uploads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: file.name,
        size: file.size,
        fingerprint,
      }),
    });

    if (!initResp.ok) {
      const err = await initResp.text();
      throw new Error(`Upload initiation failed: ${initResp.status} ${err}`);
    }

    const initData = await initResp.json();
    const uploadId: string = initData.upload_id;
    const partSize: number = initData.part_size;
    const totalParts: number = initData.total_parts;
    const presignedUrls: Record<number, string> = {};

    for (const p of initData.parts) {
      presignedUrls[p.part_number] = p.url;
    }

    const record: UploadRecord = {
      uploadId,
      projectId,
      filename: file.name,
      size: file.size,
      mtime: file.lastModified,
      fingerprint,
      partSize,
      totalParts,
      completedParts: [],
      status: 'uploading',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileHandle,
    };

    await saveUploadRecord(record);
    this.spawnWorkerForUpload(file, record, presignedUrls);
    return uploadId;
  }

  public async resumeUpload(file: File, uploadId: string): Promise<void> {
    const record = await getUploadRecord(uploadId);
    if (!record) {
      throw new Error(`Upload record ${uploadId} not found`);
    }

    // Verify fingerprint match
    const currentFingerprint = await computeFileFingerprint(file);
    if (currentFingerprint !== record.fingerprint) {
      throw new Error('File fingerprint mismatch: selected file differs from original upload');
    }

    // Reconcile with server GET /v1/assets/uploads/{id}
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const serverResp = await fetch(`${this.apiBaseUrl}/v1/assets/uploads/${uploadId}`, {
      headers,
    });

    let completedParts = record.completedParts;
    if (serverResp.ok) {
      const serverData = await serverResp.json();
      const serverPartsDone: PartInfo[] = (serverData.parts_done || []).map((p: any) => ({
        partNumber: p.part_number,
        etag: p.etag,
        size: p.size,
      }));

      // Merge server parts and client parts
      const partMap = new Map<number, PartInfo>();
      for (const p of completedParts) partMap.set(p.partNumber, p);
      for (const p of serverPartsDone) partMap.set(p.partNumber, p);
      completedParts = Array.from(partMap.values());
    }

    record.completedParts = completedParts;
    record.status = 'uploading';
    await saveUploadRecord(record);

    // Request presigned URLs for remaining parts
    const completedSet = new Set(completedParts.map((p) => p.partNumber));
    const missingPartNumbers: number[] = [];
    for (let p = 1; p <= record.totalParts; p++) {
      if (!completedSet.has(p)) {
        missingPartNumbers.push(p);
      }
    }

    const presignedUrls: Record<number, string> = {};
    if (missingPartNumbers.length > 0) {
      const partsToFetch = missingPartNumbers.slice(0, 10);
      const urlsResp = await fetch(`${this.apiBaseUrl}/v1/assets/uploads/${uploadId}/parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ part_numbers: partsToFetch }),
      });

      if (urlsResp.ok) {
        const urlsData = await urlsResp.json();
        for (const p of urlsData.parts) {
          presignedUrls[p.part_number] = p.url;
        }
      }
    }

    this.spawnWorkerForUpload(file, record, presignedUrls);
  }

  public pauseUpload(uploadId: string): void {
    const worker = this.activeWorkers.get(uploadId);
    if (worker) {
      worker.postMessage({ type: 'PAUSE' });
    }
  }

  public async abortUpload(uploadId: string): Promise<void> {
    const worker = this.activeWorkers.get(uploadId);
    if (worker) {
      worker.postMessage({ type: 'ABORT' });
      worker.terminate();
      this.activeWorkers.delete(uploadId);
    }

    const token = this.getToken();
    try {
      await fetch(`${this.apiBaseUrl}/v1/assets/uploads/${uploadId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Best effort deletion
    }

    await deleteUploadRecord(uploadId);
  }

  private spawnWorkerForUpload(
    file: Blob,
    record: UploadRecord,
    initialPresignedUrls: Record<number, string>
  ) {
    if (this.activeWorkers.has(record.uploadId)) {
      this.activeWorkers.get(record.uploadId)?.terminate();
    }

    const worker = new Worker(new URL('../../workers/upload.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.activeWorkers.set(record.uploadId, worker);

    worker.onmessage = async (e: MessageEvent) => {
      const { type, payload } = e.data;

      if (type === 'PROGRESS') {
        for (const l of this.progressListeners) {
          l(payload);
        }
      } else if (type === 'PART_COMPLETED') {
        const { partNumber, etag, size } = payload;
        const current = await getUploadRecord(record.uploadId);
        if (current) {
          const map = new Map(current.completedParts.map((p) => [p.partNumber, p]));
          map.set(partNumber, { partNumber, etag, size });
          current.completedParts = Array.from(map.values());
          await saveUploadRecord(current);
        }
      } else if (type === 'NEED_URLS') {
        const { partNumbers } = payload;
        const token = this.getToken();
        try {
          const resp = await fetch(`${this.apiBaseUrl}/v1/assets/uploads/${record.uploadId}/parts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ part_numbers: partNumbers }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const urls: Record<number, string> = {};
            for (const p of data.parts) {
              urls[p.part_number] = p.url;
            }
            worker.postMessage({ type: 'UPDATE_URLS', payload: { urls } });
          }
        } catch (err: any) {
          for (const l of this.errorListeners) {
            l(record.uploadId, `Failed to presign additional parts: ${err?.message}`);
          }
        }
      } else if (type === 'ALL_PARTS_COMPLETED') {
        const { completedParts } = payload;
        await this.finalizeUpload(record.uploadId, completedParts);
        worker.terminate();
        this.activeWorkers.delete(record.uploadId);
      } else if (type === 'PAUSED') {
        const current = await getUploadRecord(record.uploadId);
        if (current) {
          current.status = 'paused';
          await saveUploadRecord(current);
        }
        worker.terminate();
        this.activeWorkers.delete(record.uploadId);
      } else if (type === 'ERROR') {
        const current = await getUploadRecord(record.uploadId);
        if (current) {
          current.status = 'error';
          await saveUploadRecord(current);
        }
        for (const l of this.errorListeners) {
          l(record.uploadId, payload.error);
        }
        worker.terminate();
        this.activeWorkers.delete(record.uploadId);
      }
    };

    worker.postMessage({
      type: 'START',
      payload: {
        uploadId: record.uploadId,
        file,
        partSize: record.partSize,
        totalParts: record.totalParts,
        completedPartNumbers: record.completedParts.map((p) => p.partNumber),
        presignedUrls: initialPresignedUrls,
      },
    });
  }

  private async finalizeUpload(
    uploadId: string,
    completedParts: { partNumber: number; etag: string }[]
  ): Promise<void> {
    const token = this.getToken();
    const partsPayload = completedParts.map((p) => ({
      part_number: p.partNumber,
      etag: p.etag,
    }));

    const resp = await fetch(`${this.apiBaseUrl}/v1/assets/uploads/${uploadId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ parts: partsPayload }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      for (const l of this.errorListeners) {
        l(uploadId, `Complete multipart upload failed: ${resp.status} ${err}`);
      }
      return;
    }

    const data = await resp.json();
    const current = await getUploadRecord(uploadId);
    if (current) {
      current.status = 'completed';
      await saveUploadRecord(current);
    }

    for (const l of this.completeListeners) {
      l({
        uploadId,
        assetId: data.asset_id,
        status: data.status,
      });
    }
  }
}
