import React, { useState } from 'react';

type Mode = 'edit' | 'transcript' | 'assets' | 'settings';

export const LeftRail: React.FC = () => {
  const [activeMode, setActiveMode] = useState<Mode>('edit');

  const modes: { id: Mode; label: string; icon: string }[] = [
    { id: 'edit', label: 'Timeline', icon: '✂' },
    { id: 'transcript', label: 'Transcript', icon: '≡' },
    { id: 'assets', label: 'Assets', icon: '◫' },
    { id: 'settings', label: 'Setup', icon: '⚙' },
  ];

  return (
    <nav
      className="left-rail hairline-r"
      style={{
        width: '64px',
        backgroundColor: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '8px',
        userSelect: 'none',
        flexShrink: 0,
      }}
      data-testid="left-rail"
      aria-label="Navigation Rail"
    >
      {modes.map((m) => {
        const isActive = activeMode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setActiveMode(m.id)}
            style={{
              width: '48px',
              height: '48px',
              padding: '0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              backgroundColor: isActive ? 'var(--bg-2)' : 'transparent',
              borderColor: isActive ? 'var(--cut)' : 'transparent',
              color: isActive ? 'var(--text-0)' : 'var(--text-2)',
              position: 'relative',
            }}
            title={m.label}
            aria-label={m.label}
          >
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  left: '-8px',
                  width: '2px',
                  height: '24px',
                  backgroundColor: 'var(--cut)',
                }}
              />
            )}
            <span style={{ fontSize: '15px' }}>{m.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>
              {m.label.slice(0, 4)}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
