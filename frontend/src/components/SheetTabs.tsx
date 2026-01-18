'use client';

import { useState } from 'react';
import { Plus, X, Edit2, Copy, Check, LayoutTemplate } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/types';
import TemplateSelector from './TemplateSelector';

interface SheetTabsProps {
  project: Project;
}

export default function SheetTabs({ project }: SheetTabsProps) {
  const {
    currentSheetId,
    setCurrentSheet,
    createSheet,
    updateSheet,
    deleteSheet,
    duplicateSheet,
  } = useProjectStore();

  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

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

  const handleDeleteSheet = (sheetId: string, sheetName: string) => {
    if (confirm(`"${sheetName}" 시트를 삭제하시겠습니까?`)) {
      deleteSheet(project.id, sheetId);
    }
  };

  return (
    <div
      className="flex items-center gap-1 border-b px-2 py-1 overflow-x-auto"
      style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
    >
      {project.sheets.map((sheet) => {
        const isActive = currentSheetId === sheet.id;
        return (
          <div
            key={sheet.id}
            className="group flex items-center gap-1 px-3 py-1.5 rounded-t border border-b-0 cursor-pointer min-w-[80px] transition-colors"
            style={{
              background: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              borderColor: isActive ? 'var(--border-primary)' : 'transparent',
              marginBottom: isActive ? '-1px' : '0',
            }}
            onClick={() => setCurrentSheet(sheet.id)}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)';
            }}
          >
            {editingSheetId === sheet.id ? (
              <div className="flex items-center gap-1">
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
                  className="w-24 px-1 py-0.5 text-sm border rounded"
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
                <span className="text-sm truncate max-w-[100px]" style={{ color: 'var(--text-primary)' }}>
                  {sheet.name}
                </span>
                <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(sheet.id, sheet.name);
                    }}
                    className="p-0.5 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    title="이름 변경"
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
                    title="복제"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {project.sheets.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSheet(sheet.id, sheet.name);
                      }}
                      className="p-0.5 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </>
            )}
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
            placeholder="시트 이름"
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
            추가
          </button>
          <button
            onClick={() => {
              setShowNewSheet(false);
              setNewSheetName('');
            }}
            className="px-2 py-1 text-sm rounded transition-colors"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            취소
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
            title="빈 시트 추가"
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
            title="템플릿에서 추가"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span className="text-xs">템플릿</span>
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
  );
}
