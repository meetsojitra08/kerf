import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

describe('Schema Codegen Pipeline', () => {
  const schemaPkgDir = path.resolve(__dirname, '..');
  const timelineSchemaPath = path.join(schemaPkgDir, 'schemas', 'timeline.json');
  const generatedTsPath = path.join(schemaPkgDir, 'src', 'generated', 'timeline.ts');
  const generatedPyPath = path.join(schemaPkgDir, 'python', 'kerf_schema', 'generated', 'timeline.py');

  it('generates both TS and Python models when codegen runs', () => {
    expect(fs.existsSync(generatedTsPath)).toBe(true);
    expect(fs.existsSync(generatedPyPath)).toBe(true);
  });

  it('regenerates both TS and Python targets when schema changes', () => {
    // 1. Read original schema
    const originalContent = fs.readFileSync(timelineSchemaPath, 'utf8');
    const schemaObj = JSON.parse(originalContent);

    // 2. Add a unique test property to Timeline
    schemaObj.properties.test_codegen_field = {
      type: 'string',
      description: 'Temporary test property to verify dual regeneration'
    };

    try {
      // 3. Write modified schema and run codegen
      fs.writeFileSync(timelineSchemaPath, JSON.stringify(schemaObj, null, 2), 'utf8');
      execSync('node scripts/codegen.mjs', { cwd: schemaPkgDir, stdio: 'pipe' });

      // 4. Verify TS generated file contains test property
      const tsContent = fs.readFileSync(generatedTsPath, 'utf8');
      expect(tsContent).toContain('test_codegen_field');

      // 5. Verify Python generated file contains test property
      const pyContent = fs.readFileSync(generatedPyPath, 'utf8');
      expect(pyContent).toContain('test_codegen_field');
    } finally {
      // 6. Restore original schema and regenerate clean models
      fs.writeFileSync(timelineSchemaPath, originalContent, 'utf8');
      execSync('node scripts/codegen.mjs', { cwd: schemaPkgDir, stdio: 'pipe' });

      const restoredTs = fs.readFileSync(generatedTsPath, 'utf8');
      expect(restoredTs).not.toContain('test_codegen_field');
      const restoredPy = fs.readFileSync(generatedPyPath, 'utf8');
      expect(restoredPy).not.toContain('test_codegen_field');
    }
  });
});
