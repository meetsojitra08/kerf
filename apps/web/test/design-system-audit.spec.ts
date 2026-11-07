import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Design System Audit & /ui-review Compliance', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const tokensCssPath = path.resolve(rootDir, 'packages/ui/tokens.css');
  const webSrcDir = path.resolve(rootDir, 'apps/web/src');

  it('declares exact warm graphite and cut line tokens in tokens.css', () => {
    const tokens = fs.readFileSync(tokensCssPath, 'utf8');

    // Color tokens from docs/DESIGN_SYSTEM.md
    expect(tokens).toContain('--bg-0: #0E0E0C');
    expect(tokens).toContain('--bg-1: #151512');
    expect(tokens).toContain('--bg-2: #1C1C18');
    expect(tokens).toContain('--bg-3: #26261F');
    expect(tokens).toContain('--rule: #2F2F27');
    expect(tokens).toContain('--text-0: #ECE9DF');
    expect(tokens).toContain('--text-1: #B9B5A6');
    expect(tokens).toContain('--text-2: #7E7B6E');
    expect(tokens).toContain('--cut: #FF4A2B');
    expect(tokens).toContain('--agent: #D8C46A');
    expect(tokens).toContain('--ok: #7FB685');
    expect(tokens).toContain('--warn: #E0A53A');
    expect(tokens).toContain('--err: #E5584B');

    // Font families
    expect(tokens).toContain('Instrument Sans');
    expect(tokens).toContain('JetBrains Mono');
    expect(tokens).toContain('Fraunces');
  });

  it('strictly adheres to anti-pattern prohibitions (no gradients, sparkles, glassmorphism)', () => {
    // Scan all ts, tsx, css files in apps/web/src
    function scanFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanFiles(fullPath));
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const files = scanFiles(webSrcDir);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');

      // Prohibited generic-AI patterns from docs/DESIGN_SYSTEM.md
      expect(content).not.toMatch(/linear-gradient\(.*#8B5CF6/i); // No purple gradient
      expect(content).not.toMatch(/backdrop-blur/i);               // No glassmorphism
      expect(content).not.toMatch(/sparkle/i);                     // No sparkle icon
      expect(content).not.toMatch(/magic-wand/i);                  // No magic wand
      expect(content).not.toMatch(/rounded-2xl/i);                 // No rounded-2xl cards
    }
  });
});
