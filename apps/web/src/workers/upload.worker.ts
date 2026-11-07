/// <reference lib="webworker" />

export interface WorkerStartPayload {
  uploadId: string;
  file: Blob;
  partSize: number;
  totalParts: number;
  completedPartNumbers: number[];
  presignedUrls: Record<number, string>;
}

export interface WorkerMessage {
  type: 'START' | 'PAUSE' | 'ABORT' | 'UPDATE_URLS';
  payload?: any;
}

const MIN_CONCURRENCY = 3;
const MAX_CONCURRENCY = 6;
const MAX_RETRIES = 5;

class WorkerUploadCoordinator {
  private active = false;
  private paused = false;
  private aborted = false;
  private concurrency = 4;
  private inFlight = 0;
  private queue: number[] = [];
  private presignedUrls: Record<number, string> = {};
  private completedParts: { partNumber: number; etag: string; size: number }[] = [];
  private partSize = 0;
  private totalParts = 0;
  private totalBytes = 0;
  private bytesUploaded = 0;
  private file: Blob | null = null;
  private uploadId = '';
  private lastSpeedSampleTime = Date.now();
  private bytesSinceLastSample = 0;
  private currentSpeedBps = 0;

  public start(payload: WorkerStartPayload) {
    this.uploadId = payload.uploadId;
    this.file = payload.file;
    this.partSize = payload.partSize;
    this.totalParts = payload.totalParts;
    this.totalBytes = payload.file.size;
    this.presignedUrls = { ...payload.presignedUrls };
    this.active = true;
    this.paused = false;
    this.aborted = false;
    this.concurrency = 4;
    this.inFlight = 0;

    const completedSet = new Set(payload.completedPartNumbers);
    this.queue = [];
    this.bytesUploaded = 0;

    for (let p = 1; p <= this.totalParts; p++) {
      if (!completedSet.has(p)) {
        this.queue.push(p);
      } else {
        const startByte = (p - 1) * this.partSize;
        const endByte = Math.min(startByte + this.partSize, this.totalBytes);
        this.bytesUploaded += endByte - startByte;
      }
    }

    this.lastSpeedSampleTime = Date.now();
    this.bytesSinceLastSample = 0;
    this.pump();
  }

  public updateUrls(urls: Record<number, string>) {
    Object.assign(this.presignedUrls, urls);
    if (this.active && !this.paused) {
      this.pump();
    }
  }

  public pause() {
    this.paused = true;
    this.active = false;
    postMessage({ type: 'PAUSED', payload: { uploadId: this.uploadId } });
  }

  public abort() {
    this.aborted = true;
    this.active = false;
    this.queue = [];
    postMessage({ type: 'ABORTED', payload: { uploadId: this.uploadId } });
  }

  private pump() {
    if (!this.active || this.paused || this.aborted) return;

    while (this.inFlight < this.concurrency && this.queue.length > 0) {
      const partNumber = this.queue[0];
      const url = this.presignedUrls[partNumber];

      if (!url) {
        // Need URLs from main thread
        const needed = this.queue.slice(0, 10).filter((p) => !this.presignedUrls[p]);
        postMessage({
          type: 'NEED_URLS',
          payload: { uploadId: this.uploadId, partNumbers: needed },
        });
        break;
      }

      this.queue.shift();
      this.inFlight++;
      this.uploadPartWithRetry(partNumber, url, 0);
    }

    if (this.inFlight === 0 && this.queue.length === 0 && this.active) {
      this.active = false;
      postMessage({
        type: 'ALL_PARTS_COMPLETED',
        payload: { uploadId: this.uploadId, completedParts: this.completedParts },
      });
    }
  }

  private async uploadPartWithRetry(partNumber: number, url: string, attempt: number) {
    if (!this.active || this.paused || this.aborted || !this.file) return;

    const startByte = (partNumber - 1) * this.partSize;
    const endByte = Math.min(startByte + this.partSize, this.totalBytes);
    const chunk = this.file.slice(startByte, endByte);
    const chunkSize = chunk.size;
    const startTime = Date.now();

    try {
      const resp = await fetch(url, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      }

      const etagHeader = resp.headers.get('ETag');
      if (!etagHeader) {
        throw new Error('ETag header missing from S3 response');
      }

      const etag = etagHeader.replace(/"/g, '').trim();
      const partInfo = { partNumber, etag, size: chunkSize };
      this.completedParts.push(partInfo);
      this.bytesUploaded += chunkSize;
      this.bytesSinceLastSample += chunkSize;

      // Calculate speed and ETA
      const now = Date.now();
      const elapsedSec = (now - this.lastSpeedSampleTime) / 1000;
      if (elapsedSec >= 1.0) {
        this.currentSpeedBps = Math.round(this.bytesSinceLastSample / elapsedSec);
        this.lastSpeedSampleTime = now;
        this.bytesSinceLastSample = 0;
      }

      const remainingBytes = this.totalBytes - this.bytesUploaded;
      const etaSeconds =
        this.currentSpeedBps > 0 ? Math.ceil(remainingBytes / this.currentSpeedBps) : 0;
      const percent = Math.min(100, Math.round((this.bytesUploaded / this.totalBytes) * 100));

      postMessage({
        type: 'PROGRESS',
        payload: {
          uploadId: this.uploadId,
          bytesUploaded: this.bytesUploaded,
          totalBytes: this.totalBytes,
          speedBps: this.currentSpeedBps,
          etaSeconds,
          percent,
        },
      });

      postMessage({
        type: 'PART_COMPLETED',
        payload: {
          uploadId: this.uploadId,
          partNumber,
          etag,
          size: chunkSize,
        },
      });

      // Adaptive concurrency: increase on fast stable transfer
      const durationMs = Date.now() - startTime;
      if (durationMs < 2000 && this.concurrency < MAX_CONCURRENCY) {
        this.concurrency++;
      }

      this.inFlight--;
      this.pump();
    } catch (err: any) {
      this.inFlight--;

      // Adaptive concurrency: throttle down on failure
      if (this.concurrency > MIN_CONCURRENCY) {
        this.concurrency = Math.max(MIN_CONCURRENCY, this.concurrency - 1);
      }

      if (attempt < MAX_RETRIES && !this.paused && !this.aborted) {
        // Exponential backoff with jitter
        const delay = Math.min(10000, 500 * Math.pow(2, attempt) + Math.random() * 300);
        setTimeout(() => {
          if (this.active && !this.paused && !this.aborted) {
            this.inFlight++;
            this.uploadPartWithRetry(partNumber, url, attempt + 1);
          } else {
            this.queue.unshift(partNumber);
          }
        }, delay);
      } else {
        postMessage({
          type: 'ERROR',
          payload: {
            uploadId: this.uploadId,
            partNumber,
            error: err?.message || 'Part upload failed after retries',
          },
        });
      }
    }
  }
}

const coordinator = new WorkerUploadCoordinator();

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;
  switch (type) {
    case 'START':
      coordinator.start(payload);
      break;
    case 'UPDATE_URLS':
      coordinator.updateUrls(payload.urls);
      break;
    case 'PAUSE':
      coordinator.pause();
      break;
    case 'ABORT':
      coordinator.abort();
      break;
  }
};
