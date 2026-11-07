/**
 * Kerf "Cutting Room" Design Tokens
 * Source of truth for all typography, colors, measurements, and motion.
 */

export const COLORS = {
  bg0: '#0E0E0C',
  bg1: '#151512',
  bg2: '#1C1C18',
  bg3: '#26261F',
  rule: '#2F2F27',

  text0: '#ECE9DF',
  text1: '#B9B5A6',
  text2: '#7E7B6E',

  cut: '#FF4A2B',
  cutDim: 'rgba(255, 74, 43, 0.133)',
  agent: '#D8C46A',

  ok: '#7FB685',
  warn: '#E0A53A',
  err: '#E5584B',

  tracks: {
    video: '#6E8FA6',
    audio: '#7FA37B',
    music: '#A98BB5',
    caption: '#C9A36A',
    overlay: '#B87C6B',
  },
} as const;

export const TYPOGRAPHY = {
  fontUi: '"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontDisplay: '"Fraunces", Georgia, serif',
  sizes: {
    11: '11px',
    12: '12px',
    13: '13px',
    15: '15px',
    20: '20px',
    28: '28px',
    44: '44px',
  },
} as const;

export const MOTION = {
  durations: {
    micro: 90,
    state: 160,
    panel: 240,
    agentSettle: 400,
  },
  curves: {
    easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
    easeSettle: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
} as const;

export const LAYOUT = {
  topBarHeight: 40,
  leftRailWidth: 64,
  mediaPanelWidth: 320,
  directorPanelWidth: 360,
  timelineMinHeight: 280,
  gridUnit: 4,
} as const;
