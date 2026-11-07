# Data Model (PostgreSQL 16 + pgvector)

```sql
CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE projects (id uuid PRIMARY KEY, owner_id uuid REFERENCES users, name text NOT NULL,
  fps_num int NOT NULL DEFAULT 30, fps_den int NOT NULL DEFAULT 1, width int DEFAULT 1920, height int DEFAULT 1080,
  head_revision bigint NOT NULL DEFAULT 0, created_at timestamptz DEFAULT now());

CREATE TABLE assets (id uuid PRIMARY KEY, project_id uuid REFERENCES projects ON DELETE CASCADE,
  kind text CHECK (kind IN ('video','audio','image','generated')), name text,
  storage_key text, proxy_key text, peaks_key text, sprite_key text,
  duration_us bigint, width int, height int, fps_num int, fps_den int, codec jsonb,
  status text CHECK (status IN ('uploading','ingesting','ready_for_edit','indexed','failed')),
  provenance jsonb, checksum text, created_at timestamptz DEFAULT now());

CREATE TABLE uploads (id uuid PRIMARY KEY, project_id uuid, s3_upload_id text, size bigint, part_size int,
  parts_done jsonb DEFAULT '[]', fingerprint text, status text, created_at timestamptz DEFAULT now());

-- Index layer
CREATE TABLE transcript_segments (id uuid PRIMARY KEY, asset_id uuid REFERENCES assets ON DELETE CASCADE,
  speaker_id uuid, start_us bigint, end_us bigint, text text, words jsonb, -- [{w,s,e,conf}]
  embedding vector(1024), tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED);
CREATE INDEX ON transcript_segments USING gin (tsv);
CREATE INDEX ON transcript_segments USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON transcript_segments (asset_id, start_us);

CREATE TABLE speakers (id uuid PRIMARY KEY, asset_id uuid, label text, display_name text, voice_embedding vector(256));
CREATE TABLE scenes (id uuid PRIMARY KEY, asset_id uuid, start_us bigint, end_us bigint,
  caption text, on_screen_text text, shot_type text, keyframe_keys text[], embedding vector(1024));
CREATE INDEX ON scenes USING hnsw (embedding vector_cosine_ops);
CREATE TABLE audio_events (id uuid PRIMARY KEY, asset_id uuid, kind text, start_us bigint, end_us bigint, meta jsonb);
CREATE TABLE index_state (asset_id uuid, stage text, model_version text, status text, progress real,
  updated_at timestamptz, PRIMARY KEY (asset_id, stage, model_version));

-- Timeline layer
CREATE TABLE changesets (id uuid PRIMARY KEY, project_id uuid REFERENCES projects, origin text,
  base_revision bigint, result_revision bigint, status text, summary text, plan_id uuid,
  ops jsonb NOT NULL, inverse_ops jsonb NOT NULL, created_by uuid, created_at timestamptz DEFAULT now());
CREATE INDEX ON changesets (project_id, result_revision);
CREATE TABLE snapshots (project_id uuid, revision bigint, timeline jsonb NOT NULL, created_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, revision));
CREATE TABLE versions (id uuid PRIMARY KEY, project_id uuid, revision bigint, label text, created_at timestamptz DEFAULT now());

-- Agent
CREATE TABLE agent_runs (id uuid PRIMARY KEY, project_id uuid, prompt text, intent jsonb, context_refs jsonb,
  plan jsonb, model text, tokens_in int, tokens_out int, latency_ms int, changeset_id uuid, status text, created_at timestamptz DEFAULT now());
CREATE TABLE style_profiles (id uuid PRIMARY KEY, project_id uuid, profile jsonb, created_at timestamptz DEFAULT now());

-- Jobs & renders
CREATE TABLE jobs (id uuid PRIMARY KEY, type text, project_id uuid, idempotency_key text UNIQUE,
  status text, attempt int DEFAULT 0, progress real, enqueued_at timestamptz, started_at timestamptz,
  finished_at timestamptz, error text, metrics jsonb);
CREATE TABLE renders (id uuid PRIMARY KEY, project_id uuid, revision bigint, preset text, status text,
  output_key text, segments int, segments_done int, requested_at timestamptz, finished_at timestamptz);
```
Notes: timeline JSON is stored in snapshots plus the op log (not normalized per clip); queries over clips are done on the in-memory model. Keep `ops`/`inverse_ops` as compressed JSONB. Partition `changesets` by project hash if > 100M rows.
