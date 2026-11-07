import { describe, it, expect } from 'vitest';
import { TIMELINE_CORE_VERSION } from '../src/index';

describe('@kerf/timeline-core', () => {
  it('exports TIMELINE_CORE_VERSION', () => {
    expect(TIMELINE_CORE_VERSION).toBe('0.1.0');
  });
});
