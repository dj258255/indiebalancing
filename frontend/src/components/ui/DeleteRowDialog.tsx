'use client';

import { useEffect, useRef } from 'react';
import { Trash2, X, Eraser } from 'lucide-react';
import { useEscapeKey } from '@/hooks';
import { useTranslations } from 'next-intl';

export interface DeleteRowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClearValues: () => void;
  onDeleteRow: () => void;
  rowIndex: number;
}

export default function DeleteRowDialog({
  isOpen,
  onClose,
  onClearValues,
  onDeleteRow,
  rowIndex,
}: DeleteRowDialogProps) {
  const t = useTranslations('table');
  const tCommon = useTranslations('common');
  const clearButtonRef = useRef<HTMLButtonElement>(null);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      clearButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center modal-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl shadow-2xl animate-scaleIn overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'var(--warning-light)' }}
            >
              <Trash2 className="w-5 h-5" style={{ color: 'var(--warning)' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('deleteRowOptions')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {t('deleteRowOptionsDesc', { index: rowIndex + 1 })}
          </p>

          <div className="space-y-3">
            {/* 값만 지우기 버튼 */}
            <button
              ref={clearButtonRef}
              onClick={() => {
                onClearValues();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:shadow-md"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--primary-blue-light)' }}
              >
                <Eraser className="w-4 h-4" style={{ color: 'var(--primary-blue)' }} />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {t('clearValuesOnly')}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {t('clearValuesOnlyDesc')}
                </div>
              </div>
            </button>

            {/* 행 삭제 버튼 */}
            <button
              onClick={() => {
                onDeleteRow();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:shadow-md"
              style={{
                background: 'var(--error-light)',
                borderColor: 'var(--error)',
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--error)' }}
              >
                <Trash2 className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm" style={{ color: 'var(--error)' }}>
                  {t('deleteRowCompletely')}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t('deleteRowCompletelyDesc')}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div
          className="px-5 py-4"
          style={{ borderTop: '1px solid var(--border-primary)' }}
        >
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            {tCommon('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
