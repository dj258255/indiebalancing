'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Edit2, Copy, Check, LayoutTemplate, GripVertical } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/types';
import { TemplateSelector } from '@/components/panels';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface SheetTabsProps {
  project: Project;
}

const MIN_TAB_WIDTH = 80;
const MAX_TAB_WIDTH = 300;
const DEFAULT_TAB_WIDTH = 120;

export default function SheetTabs({ project }: SheetTabsProps) {
  const t = useTranslations();
  const {
    currentSheetId,
    openSheetTabs,
    setCurrentSheet,
    createSheet,
    updateSheet,
    duplicateSheet,
    closeSheetTab,
    reorderOpenTabs,
  } = useProjectStore();

  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // 탭 너비 상태
  const [tabWidths, setTabWidths] = useState<Record<string, number>>({});
  const [resizingTabId, setResizingTabId] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // 탭 드래그 상태
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // localStorage에서 탭 너비 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('sheetTabWidths');
    if (saved) {
      try {
        setTabWidths(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // 탭 너비 저장
  const saveTabWidths = useCallback((widths: Record<string, number>) => {
    localStorage.setItem('sheetTabWidths', JSON.stringify(widths));
  }, []);

  const getTabWidth = (sheetId: string) => {
    return tabWidths[sheetId] || DEFAULT_TAB_WIDTH;
  };

  // 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingTabId(sheetId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(getTabWidth(sheetId));
  };

  // 리사이즈 중
  useEffect(() => {
    if (!resizingTabId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX;
      const newWidth = Math.max(MIN_TAB_WIDTH, Math.min(MAX_TAB_WIDTH, resizeStartWidth + delta));
      setTabWidths(prev => ({
        ...prev,
        [resizingTabId]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setTabWidths(prev => {
        saveTabWidths(prev);
        return prev;
      });
      setResizingTabId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingTabId, resizeStartX, resizeStartWidth, saveTabWidths]);

  const handleStartEdit = (sheetId: string, name: string) => {
    setEditingSheetId(sheetId);
    setEditName(name);
  };

  const handleFinishEdit = () => {
    if (editingSheetId && editName.trim()) {
      updateSheet(project.id, editingSheetId, { name: editName.trim() });
    }
    setEditingSheetId(null);
    setEditName('');
  };

  const handleCreateSheet = () => {
    if (newSheetName.trim()) {
      createSheet(project.id, newSheetName.trim());
      setNewSheetName('');
      setShowNewSheet(false);
    }
  };

  // 열린 탭 순서대로 시트 정렬
  const openSheets = openSheetTabs
    .map((tabId) => project.sheets.find((s) => s.id === tabId))
    .filter((sheet): sheet is NonNullable<typeof sheet> => sheet !== undefined);

  // 탭 드래그 핸들러
  const handleTabDragStart = (e: React.DragEvent, sheetId: string) => {
    e.dataTransfer.setData('text/plain', sheetId);
    e.dataTransfer.setData('application/x-sheet-tab', sheetId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTabId(sheetId);
  };

  const handleTabDragOver = (e: React.DragEvent, sheetId: string) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/x-sheet-tab')) {
      setDragOverTabId(sheetId);
    }
  };

  const handleTabDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleTabDrop = (e: React.DragEvent, targetSheetId: string) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== targetSheetId) {
      const fromIndex = openSheetTabs.indexOf(draggedTabId);
      const toIndex = openSheetTabs.indexOf(targetSheetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        reorderOpenTabs(fromIndex, toIndex);
      }
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleTabDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  return (
    <>
      {/* 리사이즈 중 오버레이 */}
      {resizingTabId && (
        <div className="fixed inset-0 z-50" style={{ cursor: 'ew-resize' }} />
      )}

      <div
        className="flex items-center gap-1 border-b px-2 py-1 overflow-x-auto"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
      >
        {openSheets.map((sheet) => {
          const isActive = currentSheetId === sheet.id;
          const tabWidth = getTabWidth(sheet.id);

          return (
            <div
              key={sheet.id}
              draggable={editingSheetId !== sheet.id}
              onDragStart={(e) => handleTabDragStart(e, sheet.id)}
              onDragOver={(e) => handleTabDragOver(e, sheet.id)}
              onDragLeave={handleTabDragLeave}
              onDrop={(e) => handleTabDrop(e, sheet.id)}
              onDragEnd={handleTabDragEnd}
              className={cn(
                "group flex items-center gap-1 pl-1 pr-3 py-1.5 rounded-t border border-b-0 cursor-pointer transition-colors relative",
                dragOverTabId === sheet.id && "ring-2 ring-[var(--accent)]",
              )}
              style={{
                width: `${tabWidth}px`,
                minWidth: `${MIN_TAB_WIDTH}px`,
                maxWidth: `${MAX_TAB_WIDTH}px`,
                background: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                borderColor: isActive ? 'var(--border-primary)' : 'transparent',
                marginBottom: isActive ? '-1px' : '0',
                opacity: draggedTabId === sheet.id ? 0.5 : 1,
              }}
              onClick={() => setCurrentSheet(sheet.id)}
              onMouseEnter={(e) => {
                if (!isActive && !draggedTabId) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive && !draggedTabId) e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
            >
              {/* 드래그 핸들 */}
              <GripVertical
                className="w-3 h-3 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing flex-shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
              />

              {editingSheetId === sheet.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleFinishEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishEdit();
                      if (e.key === 'Escape') {
                        setEditingSheetId(null);
                        setEditName('');
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 px-1 py-0.5 text-sm border rounded"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                    autoFocus
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFinishEdit();
                    }}
                    style={{ color: 'var(--primary-green)' }}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="text-sm truncate flex-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {sheet.name}
                  </span>
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(sheet.id, sheet.name);
                      }}
                      className="p-0.5 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      title={t('sheet.rename')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateSheet(project.id, sheet.id);
                      }}
                      className="p-0.5 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      title={t('common.copy')}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeSheetTab(sheet.id);
                      }}
                      className="p-0.5 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      title={t('common.close')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}

              {/* 리사이즈 핸들 */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[var(--accent)] opacity-0 group-hover:opacity-50 transition-opacity"
                onMouseDown={(e) => handleResizeStart(e, sheet.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        })}

        {showNewSheet ? (
          <div className="flex items-center gap-1 px-2">
            <input
              type="text"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSheet();
                if (e.key === 'Escape') {
                  setShowNewSheet(false);
                  setNewSheetName('');
                }
              }}
              placeholder={t('table.sheetName')}
              className="w-24 px-2 py-1 text-sm border rounded"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
            <button
              onClick={handleCreateSheet}
              className="px-2 py-1 text-sm rounded transition-colors"
              style={{ background: 'var(--primary-blue)', color: 'white' }}
            >
              {t('table.addSheet')}
            </button>
            <button
              onClick={() => {
                setShowNewSheet(false);
                setNewSheetName('');
              }}
              className="px-2 py-1 text-sm rounded transition-colors"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewSheet(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-sm rounded transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'transparent';
              }}
              title={t('sheet.newSheet')}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-sm rounded transition-colors"
              style={{ color: 'var(--primary-blue)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-blue-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title={t('table.addFromTemplate')}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span className="text-xs">{t('table.template')}</span>
            </button>
          </div>
        )}

        {/* 템플릿 선택 모달 */}
        {showTemplateSelector && (
          <TemplateSelector
            projectId={project.id}
            onClose={() => setShowTemplateSelector(false)}
            onSelect={(sheetId) => setCurrentSheet(sheetId)}
          />
        )}
      </div>
    </>
  );
}
