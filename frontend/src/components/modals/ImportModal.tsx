'use client';

import { FileJson, FileText, Code } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui';

interface ImportModalProps {
  onClose: () => void;
  onImportJSON: () => void;
  onImportCSV: () => void;
  onImportCode?: () => void;
  hasCurrentProject: boolean;
}

export default function ImportModal({
  onClose,
  onImportJSON,
  onImportCSV,
  onImportCode,
  hasCurrentProject,
}: ImportModalProps) {
  const t = useTranslations();

  const importOptions = [
    {
      id: 'json',
      icon: FileJson,
      color: 'var(--primary-blue)',
      title: t('sidebar.importJson'),
      description: t('sidebar.importJsonDesc'),
      onClick: () => {
        onImportJSON();
        onClose();
      },
      disabled: false,
    },
    {
      id: 'csv',
      icon: FileText,
      color: 'var(--success)',
      title: t('sidebar.importCsv'),
      description: hasCurrentProject ? t('sidebar.importCsvDesc') : t('sidebar.selectProjectFirst'),
      onClick: () => {
        if (hasCurrentProject) {
          onImportCSV();
          onClose();
        }
      },
      disabled: !hasCurrentProject,
    },
  ];

  // 코드 가져오기 옵션 추가 (있을 경우)
  if (onImportCode) {
    importOptions.push({
      id: 'code',
      icon: Code,
      color: 'var(--primary-purple)',
      title: t('import.codeImport'),
      description: t('import.codeImportDesc'),
      onClick: () => {
        onImportCode();
        onClose();
      },
      disabled: !hasCurrentProject,
    });
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t('common.import')} size="md" showCloseButton={true}>
      {/* 옵션 목록 */}
      <div className="p-4 space-y-2">
        {importOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={option.onClick}
              disabled={option.disabled}
              className="w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left"
              style={{
                borderColor: 'var(--border-primary)',
                background: 'var(--bg-primary)',
                opacity: option.disabled ? 0.5 : 1,
                cursor: option.disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!option.disabled) {
                  e.currentTarget.style.borderColor = option.color;
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.background = 'var(--bg-primary)';
              }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${option.color}20` }}
              >
                <Icon className="w-6 h-6" style={{ color: option.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {option.title}
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
