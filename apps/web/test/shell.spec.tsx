import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Shell } from '../src/layout/Shell';

describe('Editor Shell Layout & Interaction', () => {
  it('renders all 6 core panels in the Cutting Room layout', () => {
    render(<Shell />);

    expect(screen.getByTestId('top-bar')).toBeDefined();
    expect(screen.getByTestId('left-rail')).toBeDefined();
    expect(screen.getByTestId('media-panel')).toBeDefined();
    expect(screen.getByTestId('preview-panel')).toBeDefined();
    expect(screen.getByTestId('director-panel')).toBeDefined();
    expect(screen.getByTestId('timeline-panel')).toBeDefined();
  });

  it('renders timecode display in mono format', () => {
    render(<Shell />);
    const timecode = screen.getByTestId('timecode-display');
    expect(timecode.textContent).toMatch(/^\d{2}:\d{2}:\d{2}:\d{2}$/);
    expect(timecode.className).toContain('font-mono');
  });

  it('toggles side panels (MediaPanel and DirectorPanel) when pressing backslash key', () => {
    render(<Shell />);

    // Initially open
    expect(screen.queryByTestId('media-panel')).not.toBeNull();
    expect(screen.queryByTestId('director-panel')).not.toBeNull();

    // Trigger backslash keydown
    fireEvent.keyDown(window, { key: '\\' });

    // Collapsed
    expect(screen.queryByTestId('media-panel')).toBeNull();
    expect(screen.queryByTestId('director-panel')).toBeNull();

    // Press backslash again to restore
    fireEvent.keyDown(window, { key: '\\' });
    expect(screen.queryByTestId('media-panel')).not.toBeNull();
    expect(screen.queryByTestId('director-panel')).not.toBeNull();
  });
});
