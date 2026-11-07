import React, { useState } from 'react';

export const DirectorPanel: React.FC = () => {
  const [prompt, setPrompt] = useState('');

  return (
    <aside
      className="director-panel hairline-l"
      style={{
        width: '360px',
        backgroundColor: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        overflow: 'hidden',
      }}
      data-testid="director-panel"
      aria-label="Director's Notes Panel"
    >
      {/* Panel Header */}
      <div
        className="hairline-b"
        style={{
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          backgroundColor: 'var(--bg-1)',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)' }}>
          Director's Notes
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: '11px',
            color: 'var(--agent)',
            backgroundColor: 'var(--bg-2)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-clip)',
          }}
        >
          ready
        </span>
      </div>

      {/* Command Line Input */}
      <div
        className="hairline-b"
        style={{
          padding: '12px',
          backgroundColor: 'var(--bg-1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              backgroundColor: 'var(--bg-2)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-clip)',
              color: 'var(--text-1)',
            }}
          >
            @timeline
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe edit intent (e.g. /tighten intro)..."
            style={{ flex: 1 }}
            aria-label="Director command prompt"
          />
          <button className="primary" style={{ padding: '6px 12px' }}>
            Cut
          </button>
        </div>
      </div>

      {/* Plan / Changeset History Area */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            color: 'var(--text-2)',
            fontSize: '12px',
            lineHeight: 1.5,
            borderLeft: '2px solid var(--rule)',
            paddingLeft: '10px',
          }}
        >
          No pending edit plan. Enter an edit prompt to generate validated timeline operations.
        </div>
      </div>

      {/* Sticky Changeset Summary Bar */}
      <div
        className="hairline-t"
        style={{
          padding: '10px 12px',
          backgroundColor: 'var(--bg-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-1)' }}>
          0 ops pending
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button disabled style={{ opacity: 0.5, fontSize: '11px' }}>
            Reject
          </button>
          <button className="primary" disabled style={{ opacity: 0.5, fontSize: '11px' }}>
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
};
