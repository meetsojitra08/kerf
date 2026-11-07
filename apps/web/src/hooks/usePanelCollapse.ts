import { useEffect, useState } from 'react';

export interface PanelCollapseState {
  sidePanelsCollapsed: boolean;
  focusMode: boolean;
  toggleSidePanels: () => void;
  toggleFocusMode: () => void;
}

export function usePanelCollapse(): PanelCollapseState {
  const [sidePanelsCollapsed, setSidePanelsCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const toggleSidePanels = () => {
    setSidePanelsCollapsed((prev) => !prev);
  };

  const toggleFocusMode = () => {
    setFocusMode((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Backslash key toggles side panels
      if (e.key === '\\') {
        e.preventDefault();
        toggleSidePanels();
      }

      // 'f' or 'F' key toggles focus mode (unless modifiers pressed)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleFocusMode();
      }

      // Escape key exits focus mode
      if (e.key === 'Escape' && focusMode) {
        e.preventDefault();
        setFocusMode(false);
      }
    };

    // Expose helpers for automated testing / review
    if (typeof window !== 'undefined') {
      (window as unknown as { __toggleSidePanels?: () => void }).__toggleSidePanels = toggleSidePanels;
      (window as unknown as { __toggleFocusMode?: () => void }).__toggleFocusMode = toggleFocusMode;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  return {
    sidePanelsCollapsed,
    focusMode,
    toggleSidePanels,
    toggleFocusMode,
  };
}
