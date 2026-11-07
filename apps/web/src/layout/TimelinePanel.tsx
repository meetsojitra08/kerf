import React from 'react';

export const TimelinePanel: React.FC = () => {
  const tracks = [
    { id: 'v1', name: 'V1', kind: 'video', color: 'var(--track-video)' },
    { id: 'a1', name: 'A1', kind: 'audio', color: 'var(--track-audio)' },
    { id: 'c1', name: 'Captions', kind: 'caption', color: 'var(--track-caption)' },
  ];

  return (
    <section
      className="timeline-panel hairline-t"
      style={{
        height: '280px',
        minHeight: '280px',
        backgroundColor: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none',
      }}
      data-testid="timeline-panel"
      aria-label="Timeline Editor"
    >
      {/* Timecode Ruler */}
      <div
        className="hairline-b font-mono"
        style={{
          height: '28px',
          backgroundColor: 'var(--bg-2)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '160px',
          fontSize: '11px',
          color: 'var(--text-2)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', paddingRight: '24px' }}>
          <span>00:00:00:00</span>
          <span>00:00:05:00</span>
          <span>00:00:10:00</span>
          <span>00:00:15:00</span>
          <span>00:00:20:00</span>
          <span>00:00:25:00</span>
        </div>

        {/* Playhead Cap Indicator */}
        <div
          style={{
            position: 'absolute',
            left: '160px',
            top: 0,
            width: '10px',
            height: '28px',
            marginLeft: '-5px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--cut)',
              transform: 'rotate(45deg)',
            }}
          />
        </div>
      </div>

      {/* Tracks Container */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Track Headers Column */}
        <div
          className="hairline-r"
          style={{
            width: '160px',
            backgroundColor: 'var(--bg-1)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          {tracks.map((track) => (
            <div
              key={track.id}
              className="hairline-b"
              style={{
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '3px',
                    height: '16px',
                    backgroundColor: track.color,
                    borderRadius: '1px',
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-0)' }}>
                  {track.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={{
                    padding: '2px 5px',
                    fontSize: '10px',
                    color: 'var(--text-2)',
                    borderColor: 'transparent',
                  }}
                  title="Mute track"
                >
                  M
                </button>
                <button
                  style={{
                    padding: '2px 5px',
                    fontSize: '10px',
                    color: 'var(--text-2)',
                    borderColor: 'transparent',
                  }}
                  title="Solo track"
                >
                  S
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Canvas & Tracks Area */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-0)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {tracks.map((track) => (
            <div
              key={track.id}
              className="hairline-b"
              style={{
                height: '56px',
                position: 'relative',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
              }}
            />
          ))}

          {/* Signature Playhead Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '0px',
              width: '1px',
              backgroundColor: 'var(--cut)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        </div>
      </div>
    </section>
  );
};
