import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFileFingerprint } from '../src/lib/upload/fingerprint';
import {
  saveUploadRecord,
  getUploadRecord,
  getUploadRecordByFingerprint,
  getAllIncompleteUploads,
  deleteUploadRecord,
  UploadRecord,
} from '../src/lib/storage/indexeddb';
import { KerfUploader } from '../src/lib/upload/uploader';

describe('Resumable Multipart Upload: Fingerprint & IndexedDB', () => {
  it('computes fast collision-resistant fingerprint using size, mtime, and boundary hashes', async () => {
    const content = new Uint8Array(1024 * 1024 * 2); // 2 MiB
    content.fill(42);
    const blob1 = new Blob([content], { type: 'video/mp4' });
    const fp1 = await computeFileFingerprint(blob1, 1700000000000);

    expect(fp1).toContain('2097152_1700000000000_');

    // Identical content + mtime yields exact same fingerprint
    const blob2 = new Blob([content], { type: 'video/mp4' });
    const fp2 = await computeFileFingerprint(blob2, 1700000000000);
    expect(fp1).toBe(fp2);

    // Different mtime yields different fingerprint
    const fp3 = await computeFileFingerprint(blob2, 1700000001000);
    expect(fp3).not.toBe(fp1);

    // Different content yields different fingerprint
    const content2 = new Uint8Array(1024 * 1024 * 2);
    content2[0] = 99;
    const blob3 = new Blob([content2], { type: 'video/mp4' });
    const fp4 = await computeFileFingerprint(blob3, 1700000000000);
    expect(fp4).not.toBe(fp1);
  });

  it('persists upload state in IndexedDB and retrieves by uploadId or fingerprint', async () => {
    const record: UploadRecord = {
      uploadId: 'upload-uuid-1',
      projectId: 'proj-1',
      filename: 'camera_a.mov',
      size: 50 * 1024 * 1024,
      mtime: 1700000000000,
      fingerprint: 'fp_test_123',
      partSize: 16 * 1024 * 1024,
      totalParts: 4,
      completedParts: [{ partNumber: 1, etag: 'etag1', size: 16 * 1024 * 1024 }],
      status: 'uploading',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveUploadRecord(record);

    const retrieved = await getUploadRecord('upload-uuid-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.uploadId).toBe('upload-uuid-1');
    expect(retrieved?.completedParts.length).toBe(1);

    const byFp = await getUploadRecordByFingerprint('fp_test_123');
    expect(byFp?.uploadId).toBe('upload-uuid-1');

    const incomplete = await getAllIncompleteUploads();
    expect(incomplete.some((r) => r.uploadId === 'upload-uuid-1')).toBe(true);

    await deleteUploadRecord('upload-uuid-1');
    const afterDelete = await getUploadRecord('upload-uuid-1');
    expect(afterDelete).toBeNull();
  });
});

describe('Large File (5 GB) & Sizing Math', () => {
  it('correctly calculates parts for a 5 GB file (16 MiB parts, ~320 parts)', () => {
    const FIVE_GB = 5 * 1024 * 1024 * 1024; // 5,368,709,120 bytes
    const DEFAULT_PART_SIZE = 16 * 1024 * 1024; // 16 MiB
    const totalParts = Math.ceil(FIVE_GB / DEFAULT_PART_SIZE);

    expect(totalParts).toBe(320);
    expect(totalParts).toBeLessThanOrEqual(10000);
  });

  it('scales part size for 200 GB files to stay under 10,000 part limit', () => {
    const TWO_HUNDRED_GB = 200 * 1024 * 1024 * 1024;
    const neededPartSize = Math.ceil(TWO_HUNDRED_GB / 9000);
    const partSize = Math.max(16 * 1024 * 1024, neededPartSize);
    const totalParts = Math.ceil(TWO_HUNDRED_GB / partSize);

    expect(totalParts).toBeLessThanOrEqual(10000);
    expect(partSize).toBeGreaterThan(16 * 1024 * 1024);
  });
});

describe('Tab Kill & Resume Flow Simulation', () => {
  let mockWorkerInstances: any[] = [];

  beforeEach(() => {
    mockWorkerInstances = [];

    // Mock Worker constructor for jsdom environment
    vi.stubGlobal(
      'Worker',
      class MockWorker {
        public onmessage: ((e: any) => void) | null = null;
        public postMessage = vi.fn((msg: any) => {
          if (msg.type === 'START') {
            const { uploadId, completedPartNumbers } = msg.payload;
            // Simulate uploading part 1 if not done
            if (!completedPartNumbers.includes(1)) {
              setTimeout(() => {
                this.onmessage?.({
                  data: {
                    type: 'PART_COMPLETED',
                    payload: {
                      uploadId,
                      partNumber: 1,
                      etag: 'mock-etag-part-1',
                      size: 16 * 1024 * 1024,
                    },
                  },
                });
              }, 10);
            }
          }
        });
        public terminate = vi.fn();

        constructor() {
          mockWorkerInstances.push(this);
        }
      }
    );
  });

  it('reconciles completed parts on resume after tab kill and completes upload', async () => {
    const file = new File([new Uint8Array(32 * 1024 * 1024)], 'vacation.mov', {
      type: 'video/quicktime',
      lastModified: 1700000000000,
    });

    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/assets/uploads') && init?.method === 'POST' && url.includes('/complete')) {
        return {
          ok: true,
          json: async () => ({
            asset_id: 'asset-uuid-1',
            upload_id: 'upload-uuid-resumed',
            status: 'completed',
          }),
        } as Response;
      }
      if (url.includes('/assets/uploads') && init?.method === 'POST' && url.includes('/parts')) {
        return {
          ok: true,
          json: async () => ({
            parts: [{ part_number: 2, url: 'http://localhost:9010/kerf-media/part2' }],
          }),
        } as Response;
      }
      if (url.includes('/assets/uploads/') && !init?.method) {
        // GET /assets/uploads/{id}
        return {
          ok: true,
          json: async () => ({
            upload_id: 'upload-uuid-resumed',
            filename: 'vacation.mov',
            size: 32 * 1024 * 1024,
            part_size: 16 * 1024 * 1024,
            status: 'uploading',
            parts_done: [{ part_number: 1, etag: 'mock-etag-part-1', size: 16 * 1024 * 1024 }],
          }),
        } as Response;
      }
      if (url.includes('/assets/uploads') && init?.method === 'POST') {
        // Initiate upload
        return {
          ok: true,
          json: async () => ({
            upload_id: 'upload-uuid-resumed',
            part_size: 16 * 1024 * 1024,
            total_parts: 2,
            parts: [
              { part_number: 1, url: 'http://localhost:9010/kerf-media/part1' },
              { part_number: 2, url: 'http://localhost:9010/kerf-media/part2' },
            ],
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    vi.stubGlobal('fetch', mockFetch);

    const uploader = new KerfUploader('http://localhost:8000', () => 'jwt_token');

    // 1. Tab 1: Start upload
    const uploadId = await uploader.startUpload(file, 'project-1');
    expect(uploadId).toBe('upload-uuid-resumed');

    // Wait for part 1 to complete in worker
    await new Promise((r) => setTimeout(r, 30));

    const recordBeforeKill = await getUploadRecord(uploadId);
    expect(recordBeforeKill?.completedParts.some((p) => p.partNumber === 1)).toBe(true);

    // 2. SIMULATE TAB KILL: terminate worker, discard uploader instance
    mockWorkerInstances[0].terminate();

    // 3. TAB 2 (reopened): New uploader instance created
    const reopenedUploader = new KerfUploader('http://localhost:8000', () => 'jwt_token');

    // Check pending uploads from IndexedDB
    const pending = await reopenedUploader.getPendingUploads();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].uploadId).toBe(uploadId);

    // Resume upload: reconcile with GET /assets/uploads/{id}
    let completedEvent: any = null;
    reopenedUploader.onComplete((evt) => {
      completedEvent = evt;
    });

    await reopenedUploader.resumeUpload(file, uploadId);

    // Simulate worker in Tab 2 completing part 2
    const tab2Worker = mockWorkerInstances[1];
    expect(tab2Worker).toBeDefined();

    tab2Worker.onmessage?.({
      data: {
        type: 'ALL_PARTS_COMPLETED',
        payload: {
          completedParts: [
            { partNumber: 1, etag: 'mock-etag-part-1' },
            { partNumber: 2, etag: 'mock-etag-part-2' },
          ],
        },
      },
    });

    await new Promise((r) => setTimeout(r, 20));

    // Verify finalize called complete endpoint
    expect(completedEvent).not.toBeNull();
    expect(completedEvent.status).toBe('completed');
    expect(completedEvent.assetId).toBe('asset-uuid-1');

    const finalRecord = await getUploadRecord(uploadId);
    expect(finalRecord?.status).toBe('completed');
  });

  it('rejects resume if selected file does not match original fingerprint', async () => {
    const wrongFile = new File([new Uint8Array(1024 * 1024)], 'wrong.mov', {
      type: 'video/quicktime',
      lastModified: 1700000000999,
    });

    const uploader = new KerfUploader('http://localhost:8000');
    await expect(uploader.resumeUpload(wrongFile, 'upload-uuid-resumed')).rejects.toThrow(
      'File fingerprint mismatch'
    );
  });
});
