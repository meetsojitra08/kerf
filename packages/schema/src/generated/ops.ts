/* Generated from schemas/ops.json - DO NOT EDIT MANUALLY */

export type ULID = string;
export type UUID = string;
export type Microseconds = number;
export type SignedMicroseconds = number;
export type RippleMode = 'none' | 'track' | 'all_tracks';

/**
 * Authoritative schema for Kerf timeline mutation operations and changesets
 */
export interface Changeset {
  id: ULID;
  project_id: UUID;
  origin: 'user' | 'agent' | 'system';
  base_revision: number;
  ops: OpEnvelope[];
  summary: string;
  plan_id?: UUID;
  status: 'pending' | 'committed' | 'rejected' | 'undone';
  created_at: string;
}
export interface OpEnvelope {
  op: string;
  id: ULID;
  params:
    | AddTrackParams
    | RemoveTrackParams
    | InsertClipParams
    | RemoveClipParams
    | MoveClipParams
    | TrimClipParams
    | SplitClipParams
    | MergeClipsParams
    | RippleDeleteRangeParams
    | {
        [k: string]: unknown;
      };
  ripple?: RippleMode;
}
export interface AddTrackParams {
  kind: 'video' | 'audio' | 'caption' | 'overlay' | 'music';
  name: string;
  index?: number;
}
export interface RemoveTrackParams {
  track_id: ULID;
}
export interface InsertClipParams {
  track_id: ULID;
  asset_id?: UUID | null;
  start: Microseconds;
  duration: Microseconds;
  source_in?: Microseconds | null;
  source_out?: Microseconds | null;
  speed?: number;
  link_group?: ULID;
}
export interface RemoveClipParams {
  clip_id: ULID;
}
export interface MoveClipParams {
  clip_id: ULID;
  to_track_id: ULID;
  start: Microseconds;
}
export interface TrimClipParams {
  clip_id: ULID;
  edge: 'in' | 'out';
  delta: SignedMicroseconds;
}
export interface SplitClipParams {
  clip_id: ULID;
  at: Microseconds;
  new_right_clip_id?: ULID;
}
export interface MergeClipsParams {
  left_id: ULID;
  right_id: ULID;
}
export interface RippleDeleteRangeParams {
  track_ids: ULID[];
  start: Microseconds;
  end: Microseconds;
}
