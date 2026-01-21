'use client';

import { StickyNote, Undo2, Redo2, History, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Sheet } from '@/types';
import HistoryPanel from './HistoryPanel';

interface HistoryEntry {
  state: unknown;
  label: string;
  timestamp: number;
}

interface SheetHeaderProps {
  sheet: Sheet;
  onAddMemo: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showHistoryPanel: boolean;
  onToggleHistory: () => void;
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
  };
  onHistoryJump: (index: number) => void;
}

export default function SheetHeader({
  sheet,
  onAddMemo,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showHistoryPanel,
  onToggleHistory,
  history,
  onHistoryJump,
}: SheetHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-5 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h2
            className="text-base sm:text-lg lg:text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {sheet.name}
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {t('sheet.rowCount', { count: sheet.rows.length })} · {t('sheet.colCount', { count: sheet.columns.length })}
          </p>
        </div>

        <button
          onClick={onAddMemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{ background: '#fef08a', color: '#92400e' }}
          title={t('common.memo')}
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('common.memo')}</span>
        </button>
      </div>

      <div
        data-history-panel
        className="relative flex items-center gap-1 p-1 rounded-lg"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}
      >
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
          style={{ color: canUndo ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          title={t('tooltip.undoShortcut')}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4" style={{ background: 'var(--border-primary)' }} />

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
          style={{ color: canRedo ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          title={t('tooltip.redoShortcut')}
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4" style={{ background: 'var(--border-primary)' }} />

        <button
          onClick={onToggleHistory}
          className="p-1.5 rounded transition-colors hover:bg-[var(--bg-hover)] flex items-center gap-0.5"
          style={{ color: 'var(--text-secondary)' }}
          title={t('tooltip.viewHistory')}
        >
          <History className="w-4 h-4" />
          <ChevronDown
            className={`w-3 h-3 transition-transform ${showHistoryPanel ? 'rotate-180' : ''}`}
          />
        </button>

        {showHistoryPanel && (
          <HistoryPanel
            history={history}
            onJump={onHistoryJump}
          />
        )}
      </div>
    </div>
  );
}
