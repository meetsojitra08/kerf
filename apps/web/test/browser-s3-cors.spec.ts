import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser } from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

function getChromePath(): string | null {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

describe('Browser S3 CORS & ETag Exposure (Headless Chrome)', () => {
  let server: http.Server;
  let serverPort: number;
  let browser: Browser | null = null;
  const chromePath = getChromePath();

  beforeAll(async () => {
    // 1. Start local origin server
    await new Promise<void>((resolve) => {
      server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<!DOCTYPE html><html><body><h1>Cross-Origin Client</h1></body></html>');
      }).listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          serverPort = address.port;
        }
        resolve();
      });
    });

    // 2. Launch headless browser
    if (chromePath) {
      browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.close();
    }
  });

  it('performs cross-origin PUT to MinIO via presigned URL and reads exposed ETag in JavaScript', async () => {
    if (!browser) {
      console.warn('[test] Chrome not found in environment, skipping browser execution.');
      return;
    }

    // Generate presigned PUT URL via python storage service
    const pyCmd = `uv run python -c "from kerf.services.storage import generate_presigned_put_url; print(generate_presigned_put_url('browser-cors-test-${Date.now()}.bin'))"`;
    const presignedUrl = execSync(pyCmd, { cwd: path.join(rootDir, 'apps/api'), encoding: 'utf8' }).trim();
    expect(presignedUrl).toContain('http://localhost:9010');

    const page = await browser.newPage();
    try {
      // Navigate to our local origin (http://localhost:PORT)
      await page.goto(`http://localhost:${serverPort}`);

      // Execute cross-origin fetch in browser page context
      const result = await page.evaluate(async (url: string) => {
        const payload = new Blob(['TEST_KERF_BROWSER_MULTIPART_CORS_DATA_12345'], {
          type: 'application/octet-stream',
        });
        const res = await fetch(url, {
          method: 'PUT',
          body: payload,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });

        const etag = res.headers.get('ETag') || res.headers.get('etag');
        return {
          status: res.status,
          etag,
        };
      }, presignedUrl);

      // Verify browser received 200 and was permitted by CORS to read ETag
      expect(result.status).toBe(200);
      expect(result.etag).toBeTruthy();
      expect(typeof result.etag).toBe('string');
      expect(result.etag?.length).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  });
});
