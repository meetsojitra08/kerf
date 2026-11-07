import React from 'react';
import { usePanelCollapse } from '../hooks/usePanelCollapse';
import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { MediaPanel } from './MediaPanel';
import { PreviewPanel } from './PreviewPanel';
import { DirectorPanel } from './DirectorPanel';
import { TimelinePanel } from './TimelinePanel';

export const Shell: React.FC = () => {
  const {
    sidePanelsCollapsed,
    focusMode,
    toggleSidePanels,
  } = usePanelCollapse();

  return (
    <div
      className="kerf-editor-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-0)',
      }}
      data-testid="editor-shell"
    >
      {/* Top Bar (40px) */}
      {!focusMode && (
        <TopBar
          sidePanelsCollapsed={sidePanelsCollapsed}
          onTogglePanels={toggleSidePanels}
        />
      )}

      {/* Main Workspace (Middle Row) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Rail (64px) */}
        {!focusMode && <LeftRail />}

        {/* Media & Index Panel (320px, collapsible) */}
        {!focusMode && !sidePanelsCollapsed && <MediaPanel />}

        {/* Central Preview Panel (flex) */}
        <PreviewPanel />

        {/* Director's Notes Panel (360px, collapsible) */}
        {!focusMode && !sidePanelsCollapsed && <DirectorPanel />}
      </div>

      {/* Timeline Panel (resizable, min 280px) */}
      <TimelinePanel />
    </div>
  );
};

export default Shell;
