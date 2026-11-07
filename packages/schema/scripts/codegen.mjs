import { compileFromFile } from 'json-schema-to-typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaDir = path.resolve(__dirname, '..');
const schemasDir = path.join(schemaDir, 'schemas');
const generatedTsDir = path.join(schemaDir, 'src', 'generated');
const pyOutputDir = path.join(schemaDir, 'python', 'kerf_schema', 'generated');

if (!fs.existsSync(generatedTsDir)) {
  fs.mkdirSync(generatedTsDir, { recursive: true });
}

async function generateTypeScript() {
  console.log('[codegen] Generating TypeScript types from JSON Schemas...');
  
  const timelineTs = await compileFromFile(path.join(schemasDir, 'timeline.json'), {
    bannerComment: '/* Generated from schemas/timeline.json - DO NOT EDIT MANUALLY */\n',
    style: { singleQuote: true }
  });
  fs.writeFileSync(path.join(generatedTsDir, 'timeline.ts'), timelineTs, 'utf8');

  const opsTs = await compileFromFile(path.join(schemasDir, 'ops.json'), {
    bannerComment: '/* Generated from schemas/ops.json - DO NOT EDIT MANUALLY */\n',
    style: { singleQuote: true }
  });
  fs.writeFileSync(path.join(generatedTsDir, 'ops.ts'), opsTs, 'utf8');

  const indexTs = `/* Generated barrel export - DO NOT EDIT MANUALLY */
export * from './timeline.js';
export type {
  Changeset,
  OpEnvelope,
  RippleMode,
  AddTrackParams,
  RemoveTrackParams,
  InsertClipParams,
  RemoveClipParams,
  MoveClipParams,
  TrimClipParams,
  SplitClipParams,
  MergeClipsParams,
  RippleDeleteRangeParams
} from './ops.js';
`;
  fs.writeFileSync(path.join(generatedTsDir, 'index.ts'), indexTs, 'utf8');
  console.log(`[codegen] TypeScript generated in: ${generatedTsDir}`);
}

function generatePython() {
  console.log('[codegen] Generating Pydantic v2 models from JSON Schemas...');
  const cmd = `uv run datamodel-codegen --input "${schemasDir}" --output "${pyOutputDir}" --output-model-type pydantic_v2.BaseModel`;
  execSync(cmd, { stdio: 'inherit', cwd: path.resolve(schemaDir, '../..') });
  console.log(`[codegen] Pydantic generated in: ${pyOutputDir}`);
}

async function run() {
  try {
    await generateTypeScript();
    generatePython();
    console.log('[codegen] All code generation completed successfully.');
  } catch (err) {
    console.error('[codegen] Error generating models:', err);
    process.exit(1);
  }
}

run();
