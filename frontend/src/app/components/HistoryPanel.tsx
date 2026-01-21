'use client';

import { useTranslations } from 'next-intl';

interface HistoryEntry {
  state: unknown;
  label: string;
  timestamp: number;
}

interface HistoryPanelProps {
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
  };
  onJump: (index: number) => void;
}

export default function HistoryPanel({ history, onJump }: HistoryPanelProps) {
  const t = useTranslations();
  const { past, future } = history;
  const allEntries = [...past, ...future];
  const currentPastIndex = past.length - 1;

  return (
    <div
      className="absolute top-full right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-lg shadow-xl z-50"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
    >
      <div
        className="sticky top-0 px-3 py-2 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('history.title')}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {t('history.records', { count: past.length })}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-1">
        {allEntries.length === 0 ? (
          <div className="py-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {t('history.noHistory')}
          </div>
        ) : (
          allEntries
            .map((entry, index) => {
              const isCurrent = index === currentPastIndex;
              const isPast = index < currentPastIndex;
              const time = new Date(entry.timestamp);
              const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

              // Translate label if it's a key
              const displayLabel = entry.label.startsWith('history.')
                ? t(entry.label)
                : entry.label;

              return (
                <button
                  key={index}
                  onClick={() => onJump(index)}
                  disabled={isCurrent}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                    isCurrent ? 'cursor-default' : 'hover:bg-[var(--bg-hover)]'
                  }`}
                  style={{
                    background: isCurrent ? 'var(--accent-light)' : undefined,
                    color: isPast
                      ? 'var(--text-tertiary)'
                      : isCurrent
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                  }}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isCurrent ? 'bg-[var(--accent)]' : isPast ? 'bg-gray-300' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontWeight: isCurrent ? 500 : 400 }}>
                      {displayLabel}
                      {isCurrent && (
                        <span className="ml-1 text-xs">({t('history.current')})</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {timeStr}
                  </span>
                </button>
              );
            })
            .reverse()
        )}
      </div>
    </div>
  );
}
