/* Generated from schemas/timeline.json - DO NOT EDIT MANUALLY */

/**
 * Universally Unique Lexicographically Sortable Identifier
 */
export type ULID = string;
export type UUID = string;
/**
 * Time represented in integer microseconds (us)
 */
export type Microseconds = number;

/**
 * Authoritative schema for Kerf timeline entities and data model
 */
export interface Timeline {
  id: ULID;
  project_id: UUID;
  revision: number;
  fps: Fps;
  resolution: Resolution;
  sample_rate: number;
  tracks: Track[];
  markers: Marker[];
  meta?: {
    [k: string]: unknown;
  };
}
export interface Fps {
  num: number;
  den: number;
}
export interface Resolution {
  w: number;
  h: number;
}
export interface Track {
  id: ULID;
  kind: 'video' | 'audio' | 'caption' | 'overlay' | 'music';
  name: string;
  order: number;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  height?: number;
  clips: Clip[];
}
export interface Clip {
  id: ULID;
  track_id: ULID;
  asset_id?: UUID | null;
  start: Microseconds;
  duration: Microseconds;
  source_in?: Microseconds | null;
  source_out?: Microseconds | null;
  speed?: number;
  enabled?: boolean;
  label?: string;
  tags?: string[];
  transform?: Transform;
  audio?: AudioProps;
  effects?: Effect[];
  caption?: CaptionProps;
  provenance?: Provenance;
  link_group?: ULID;
}
export interface Transform {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
}
export interface AudioProps {
  volume?: number;
  pan?: number;
  mute?: boolean;
}
export interface Effect {
  id: ULID;
  kind: string;
  enabled?: boolean;
  params: {
    [k: string]: unknown;
  };
}
export interface CaptionProps {
  text: string;
  style_id?: string;
  words?: WordHighlight[];
}
export interface WordHighlight {
  w: string;
  s: number;
  e: number;
  conf?: number;
}
export interface Provenance {
  source: 'user' | 'agent' | 'generated';
  provider?: string;
  prompt?: string;
  parent_clip_id?: ULID;
}
export interface Marker {
  id: ULID;
  t: Microseconds;
  kind: 'chapter' | 'hook' | 'highlight' | 'note';
  label: string;
  source: 'user' | 'agent';
}
