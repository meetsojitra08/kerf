import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION } from '../src/index';

describe('@kerf/schema', () => {
  it('exports SCHEMA_VERSION', () => {
    expect(SCHEMA_VERSION).toBe('0.1.0');
  });
});
