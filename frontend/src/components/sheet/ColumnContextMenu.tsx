'use client';

import { useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Edit3,
  Trash2,
  ArrowLeft,
  ArrowRight,
  EyeOff,
  Eye,
  Eraser,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ColumnContextMenuProps {
  x: number;
  y: number;
  columnName: string;
  isLocked: boolean;
  isExportExcluded: boolean;
  onClose: () => void;
  onToggleLock: () => void;
  onToggleExportExclude: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClearValues: () => void;
  onInsertLeft: () => void;
  onInsertRight: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export default function ColumnContextMenu({
  x,
  y,
  columnName,
  isLocked,
  isExportExcluded,
  onClose,
  onToggleLock,
  onToggleExportExclude,
  onEdit,
  onDelete,
  onClearValues,
  onInsertLeft,
  onInsertRight,
}: ColumnContextMenuProps) {
  const t = useTranslations();
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 위치 조정 (화면 밖으로 나가지 않도록)
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItems: MenuItem[] = [
    {
      label: isLocked ? t('table.unlockColumn') : t('table.lockColumn'),
      icon: isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />,
      onClick: onToggleLock,
    },
    {
      label: isExportExcluded ? t('table.includeInExport') : t('table.excludeFromExport'),
      icon: isExportExcluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />,
      onClick: onToggleExportExclude,
    },
    {
      label: t('table.editColumn'),
      icon: <Edit3 className="w-4 h-4" />,
      onClick: onEdit,
      divider: true,
    },
    {
      label: t('contextMenu.insertColumnLeft'),
      icon: <ArrowLeft className="w-4 h-4" />,
      onClick: onInsertLeft,
    },
    {
      label: t('contextMenu.insertColumnRight'),
      icon: <ArrowRight className="w-4 h-4" />,
      onClick: onInsertRight,
      divider: true,
    },
    {
      label: t('contextMenu.clearColumnValues'),
      icon: <Eraser className="w-4 h-4" />,
      onClick: onClearValues,
    },
    {
      label: t('table.deleteColumn'),
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] min-w-[180px] py-1 rounded-lg shadow-lg animate-scaleIn"
      style={{
        left: x,
        top: y,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-lg)',
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* 컬럼 이름 헤더 */}
      <div
        className="px-3 py-2 text-xs font-medium border-b mb-1"
        style={{
          color: 'var(--text-tertiary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {columnName}
      </div>

      {menuItems.map((item, index) => (
        <div key={index}>
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
            style={{
              color: item.danger ? 'var(--primary-red)' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.danger
                ? 'var(--primary-red-light)'
                : 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span>{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
          </button>
          {item.divider && (
            <div
              className="my-1 mx-2"
              style={{
                height: 1,
                background: 'var(--border-primary)'
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
