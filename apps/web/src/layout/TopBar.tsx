import React from 'react';

interface TopBarProps {
  projectName?: string;
  versionLabel?: string;
  sidePanelsCollapsed: boolean;
  onTogglePanels: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName = 'Untitled Cut',
  versionLabel = 'v0 · Base',
  sidePanelsCollapsed,
  onTogglePanels,
}) => {
  return (
    <header
      className="top-bar hairline-b"
      style={{
        height: '40px',
        backgroundColor: 'var(--bg-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        userSelect: 'none',
      }}
      data-testid="top-bar"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="font-display"
            style={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'var(--text-0)',
            }}
          >
            KERF
          </span>
          <span
            style={{
              width: '2px',
              height: '12px',
              backgroundColor: 'var(--cut)',
              display: 'inline-block',
            }}
          />
        </div>

        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>/</span>

        <span style={{ color: 'var(--text-0)', fontSize: '13px', fontWeight: 500 }}>
          {projectName}
        </span>

        <div
          className="font-mono"
          style={{
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--rule)',
            color: 'var(--agent)',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: 'var(--radius-clip)',
          }}
        >
          {versionLabel}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onTogglePanels}
          title={sidePanelsCollapsed ? 'Show panels (Shortcut: \\)' : 'Hide panels (Shortcut: \\)'}
          aria-label="Toggle side panels"
        >
          <span>{sidePanelsCollapsed ? 'Show Panels' : 'Hide Panels'}</span>
          <span className="font-mono" style={{ color: 'var(--text-2)', fontSize: '11px' }}>
            \
          </span>
        </button>

        <button aria-label="Share project">
          <span>Share</span>
        </button>

        <button className="primary" aria-label="Render timeline">
          <span style={{ color: 'var(--cut)', fontWeight: 'bold' }}>•</span>
          <span>Render</span>
        </button>
      </div>
    </header>
  );
};
