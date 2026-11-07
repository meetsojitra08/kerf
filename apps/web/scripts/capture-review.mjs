import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../../..');
const artifactsDir = path.join(repoRoot, 'artifacts', 'ui-review');
const brainArtifactsDir = 'C:\\Users\\meets\\.gemini\\antigravity\\brain\\627ee552-4723-454f-ab48-47108b40d973\\ui_review';

for (const dir of [artifactsDir, brainArtifactsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const viewports = [
  { width: 1280, height: 800, label: '1280px' },
  { width: 1728, height: 1080, label: '1728px' },
  { width: 2560, height: 1440, label: '2560px' },
];

async function run() {
  console.log('[ui-review] Launching headless Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    // 1. Check fonts on initial load
    console.log('[ui-review] Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    console.log('[ui-review] Verifying bundled fonts...');
    await page.evaluate(() => document.fonts.ready);

    const fontAudit = await page.evaluate(() => {
      return {
        instrumentSans: document.fonts.check('16px "Instrument Sans"'),
        jetbrainsMono: document.fonts.check('16px "JetBrains Mono"'),
        fraunces: document.fonts.check('16px "Fraunces"'),
        loadedFonts: Array.from(document.fonts).map((f) => ({
          family: f.family,
          status: f.status,
          weight: f.weight,
        })),
      };
    });

    console.log('[ui-review] Font audit results:', JSON.stringify(fontAudit, null, 2));

    const results = [];

    for (const vp of viewports) {
      console.log(`\n[ui-review] Testing viewport ${vp.label} (${vp.width}x${vp.height})...`);
      await page.setViewport({ width: vp.width, height: vp.height });

      // 1. Default Shell
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      const defaultFilename = `screenshot_${vp.width}_default.png`;
      const defaultPath = path.join(artifactsDir, defaultFilename);
      await page.screenshot({ path: defaultPath, fullPage: true });
      fs.copyFileSync(defaultPath, path.join(brainArtifactsDir, defaultFilename));
      console.log(`  -> Saved default: ${defaultFilename}`);

      // 2. Panels Collapsed (press '\')
      await page.keyboard.press('\\');
      await new Promise((r) => setTimeout(r, 400)); // wait for transition
      const collapsedFilename = `screenshot_${vp.width}_collapsed.png`;
      const collapsedPath = path.join(artifactsDir, collapsedFilename);
      await page.screenshot({ path: collapsedPath, fullPage: true });
      fs.copyFileSync(collapsedPath, path.join(brainArtifactsDir, collapsedFilename));
      console.log(`  -> Saved collapsed: ${collapsedFilename}`);

      // 3. Focus Mode (press 'f')
      // Reset back first
      await page.keyboard.press('\\');
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.press('f');
      await new Promise((r) => setTimeout(r, 400));
      const focusFilename = `screenshot_${vp.width}_focus.png`;
      const focusPath = path.join(artifactsDir, focusFilename);
      await page.screenshot({ path: focusPath, fullPage: true });
      fs.copyFileSync(focusPath, path.join(brainArtifactsDir, focusFilename));
      console.log(`  -> Saved focus: ${focusFilename}`);

      results.push({
        viewport: vp,
        default: defaultFilename,
        collapsed: collapsedFilename,
        focus: focusFilename,
      });
    }

    const report = {
      fontAudit,
      results,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(artifactsDir, 'review-manifest.json'),
      JSON.stringify(report, null, 2),
      'utf8'
    );
    fs.writeFileSync(
      path.join(brainArtifactsDir, 'review-manifest.json'),
      JSON.stringify(report, null, 2),
      'utf8'
    );
    console.log('[ui-review] Screenshot capture complete!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('[ui-review] Error:', err);
  process.exit(1);
});
