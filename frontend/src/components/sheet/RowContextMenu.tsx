'use client';

import { useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eraser,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RowContextMenuProps {
  x: number;
  y: number;
  rowIndex: number;
  isLocked: boolean;
  onClose: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onClearValues: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export default function RowContextMenu({
  x,
  y,
  rowIndex,
  isLocked,
  onClose,
  onToggleLock,
  onDelete,
  onClearValues,
  onInsertAbove,
  onInsertBelow,
}: RowContextMenuProps) {
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
      label: isLocked ? t('table.unlockRow') : t('table.lockRow'),
      icon: isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />,
      onClick: onToggleLock,
      divider: true,
    },
    {
      label: t('contextMenu.insertRowAbove'),
      icon: <ArrowUp className="w-4 h-4" />,
      onClick: onInsertAbove,
    },
    {
      label: t('contextMenu.insertRowBelow'),
      icon: <ArrowDown className="w-4 h-4" />,
      onClick: onInsertBelow,
      divider: true,
    },
    {
      label: t('contextMenu.clearRowValues'),
      icon: <Eraser className="w-4 h-4" />,
      onClick: onClearValues,
    },
    {
      label: t('contextMenu.deleteRow'),
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] min-w-[160px] py-1 rounded-lg shadow-lg animate-scaleIn"
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
      {/* 행 번호 헤더 */}
      <div
        className="px-3 py-2 text-xs font-medium border-b mb-1"
        style={{
          color: 'var(--text-tertiary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {t('table.row')} {rowIndex + 1}
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
