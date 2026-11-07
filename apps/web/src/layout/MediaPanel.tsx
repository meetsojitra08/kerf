import React, { useState } from 'react';

type Tab = 'assets' | 'transcript' | 'scenes' | 'search';

export const MediaPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('assets');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'assets', label: 'Assets' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'scenes', label: 'Scenes' },
    { id: 'search', label: 'Search' },
  ];

  return (
    <aside
      className="media-panel hairline-r"
      style={{
        width: '320px',
        backgroundColor: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        overflow: 'hidden',
      }}
      data-testid="media-panel"
      aria-label="Media & Index Panel"
    >
      {/* Tab Header */}
      <div
        className="hairline-b"
        style={{
          display: 'flex',
          padding: '0 8px',
          backgroundColor: 'var(--bg-1)',
          height: '36px',
          alignItems: 'flex-end',
          gap: '4px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                borderBottom: isActive ? '2px solid var(--cut)' : '2px solid transparent',
                borderRadius: '0',
                padding: '6px 8px',
                color: isActive ? 'var(--text-0)' : 'var(--text-2)',
                backgroundColor: 'transparent',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-clip)',
            border: '1px dashed var(--rule)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-2)',
            fontSize: '18px',
          }}
        >
          ◫
        </div>
        <div>
          <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>
            No media ingested
          </div>
          <div
            style={{
              color: 'var(--text-2)',
              fontSize: '12px',
              marginTop: '4px',
              maxWidth: '220px',
            }}
          >
            Drop multi-GB source clips to start resumable multipart ingest.
          </div>
        </div>
        <button className="primary" style={{ marginTop: '8px' }}>
          Import Media
        </button>
      </div>

      {/* Upload Tray Anchor */}
      <div
        className="hairline-t"
        style={{
          padding: '8px 12px',
          fontSize: '11px',
          color: 'var(--text-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-2)',
        }}
      >
        <span>Upload tray: idle</span>
        <span className="font-mono">0 KB/s</span>
      </div>
    </aside>
  );
};
