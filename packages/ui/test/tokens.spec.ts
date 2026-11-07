import { describe, it, expect } from 'vitest';
import { UI_VERSION } from '../src/index';

describe('@kerf/ui', () => {
  it('exports UI_VERSION', () => {
    expect(UI_VERSION).toBe('0.1.0');
  });
});
