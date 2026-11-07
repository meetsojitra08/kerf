import React, { useState } from 'react';

export const PreviewPanel: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [timecode] = useState('00:00:00:00');

  return (
    <main
      className="preview-panel"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-0)',
        overflow: 'hidden',
        minWidth: '400px',
      }}
      data-testid="preview-panel"
      aria-label="Preview Canvas and Transport"
    >
      {/* Top Header Controls */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Aspect:</span>
          <button
            onClick={() => setAspectRatio(aspectRatio === '16:9' ? '9:16' : '16:9')}
            style={{ padding: '2px 6px', fontSize: '11px' }}
          >
            {aspectRatio}
          </button>
        </div>

        <div
          className="font-mono"
          style={{
            fontSize: '13px',
            color: 'var(--text-0)',
            letterSpacing: '0.05em',
            padding: '2px 8px',
            backgroundColor: 'var(--bg-2)',
            borderRadius: 'var(--radius-clip)',
            border: '1px solid var(--rule)',
          }}
          data-testid="timecode-display"
        >
          {timecode}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>1080p 30fps</div>
      </div>

      {/* Canvas Viewport */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            aspectRatio: aspectRatio === '16:9' ? '16 / 9' : '9 / 16',
            width: aspectRatio === '16:9' ? '85%' : 'auto',
            height: aspectRatio === '9:16' ? '85%' : 'auto',
            maxHeight: '100%',
            maxWidth: '100%',
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-clip)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 0 0 1px var(--bg-0)',
          }}
        >
          <div style={{ color: 'var(--text-2)', fontSize: '12px' }}>
            Preview viewport ({aspectRatio})
          </div>
          <div
            style={{
              color: 'var(--text-2)',
              fontSize: '11px',
              marginTop: '4px',
            }}
          >
            Client WebCodecs compositor
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <div
        className="hairline-t"
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-1)',
        }}
      >
        <button title="Step Back (1 frame)" aria-label="Step back">
          ◄
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="primary"
          style={{ minWidth: '60px' }}
          aria-label={isPlaying ? 'Pause playback' : 'Play timeline'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button title="Step Forward (1 frame)" aria-label="Step forward">
          ►
        </button>
      </div>
    </main>
  );
};
