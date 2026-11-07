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

      // Escape key exits focus mode
      if (e.key === 'Escape' && focusMode) {
        e.preventDefault();
        setFocusMode(false);
      }
    };

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
