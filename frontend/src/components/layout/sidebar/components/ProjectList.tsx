/**
 * ProjectList - 프로젝트/시트 목록 컴포넌트
 */

'use client';

import { FileSpreadsheet, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Project } from '@/types';

interface ProjectListProps {
  projects: Project[];
  currentProjectId: string | null;
  currentSheetId: string | null;
  expandedProjects: Set<string>;

  // 편집 상태
  editingProjectId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  editingSheetId: string | null;
  editSheetName: string;
  setEditSheetName: (name: string) => void;

  // 드래그 상태 - 프로젝트
  draggedProjectIndex: number | null;
  dragOverProjectIndex: number | null;
  setDraggedProjectIndex: (index: number | null) => void;
  setDragOverProjectIndex: (index: number | null) => void;

  // 드래그 상태 - 시트
  draggedSheetIndex: number | null;
  draggedSheetId: string | null;
  dragOverIndex: number | null;
  dragProjectId: string | null;
  dragOverProjectId: string | null;
  setDraggedSheetIndex: (index: number | null) => void;
  setDraggedSheetId: (id: string | null) => void;
  setDragOverIndex: (index: number | null) => void;
  setDragProjectId: (id: string | null) => void;
  setDragOverProjectId: (id: string | null) => void;

  // 액션
  toggleProject: (projectId: string) => void;
  setCurrentProject: (projectId: string) => void;
  setCurrentSheet: (sheetId: string) => void;
  handleFinishEdit: () => void;
  setEditingProjectId: (id: string | null) => void;
  setEditingSheetId: (id: string | null) => void;
  updateSheet: (projectId: string, sheetId: string, updates: { name?: string }) => void;
  reorderProjects: (from: number, to: number) => void;
  reorderSheets: (projectId: string, from: number, to: number) => void;

  // 컨텍스트 메뉴
  onSheetContextMenu: (e: React.MouseEvent, projectId: string, sheetId: string, sheetName: string, exportClassName?: string) => void;
  onProjectContextMenu: (e: React.MouseEvent, projectId: string, projectName: string) => void;

  // 시트 이동 확인
  onSheetMoveConfirm: (from: string, to: string, toName: string, sheetId: string, sheetName: string) => void;

  // 삭제 확인
  onSheetDelete: (projectId: string, sheetId: string, sheetName: string) => void;
  onProjectDelete: (projectId: string, projectName: string) => void;
}

export function ProjectList({
  projects,
  currentProjectId,
  currentSheetId,
  expandedProjects,
  editingProjectId,
  editName,
  setEditName,
  editingSheetId,
  editSheetName,
  setEditSheetName,
  draggedProjectIndex,
  dragOverProjectIndex,
  setDraggedProjectIndex,
  setDragOverProjectIndex,
  draggedSheetIndex,
  draggedSheetId,
  dragOverIndex,
  dragProjectId,
  dragOverProjectId,
  setDraggedSheetIndex,
  setDraggedSheetId,
  setDragOverIndex,
  setDragProjectId,
  setDragOverProjectId,
  toggleProject,
  setCurrentProject,
  setCurrentSheet,
  handleFinishEdit,
  setEditingProjectId,
  setEditingSheetId,
  updateSheet,
  reorderProjects,
  reorderSheets,
  onSheetContextMenu,
  onProjectContextMenu,
  onSheetMoveConfirm,
  onSheetDelete,
  onProjectDelete,
}: ProjectListProps) {
  const t = useTranslations();

  if (projects.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-center py-10 px-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{
            background: 'var(--accent-light)'
          }}>
            <FileSpreadsheet className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('project.noProject')}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('project.createProject')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="space-y-1.5">
        {projects.map((project, projectIndex) => (
          <div
            key={project.id}
            draggable={editingProjectId !== project.id}
            onDragStart={(e) => {
              if (editingProjectId === project.id) return;
              e.dataTransfer.setData('application/x-project-index', String(projectIndex));
              e.dataTransfer.effectAllowed = 'move';
              setDraggedProjectIndex(projectIndex);
            }}
            onDragEnd={() => {
              setDraggedProjectIndex(null);
              setDragOverProjectIndex(null);
              setDragOverProjectId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedProjectIndex !== null) {
                setDragOverProjectIndex(projectIndex);
              }
              if (draggedSheetId && dragProjectId !== project.id) {
                setDragOverProjectId(project.id);
              }
            }}
            onDragLeave={() => {
              setDragOverProjectIndex(null);
              setDragOverProjectId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedProjectIndex !== null && draggedProjectIndex !== projectIndex) {
                reorderProjects(draggedProjectIndex, projectIndex);
              }
              if (draggedSheetId && dragProjectId && dragProjectId !== project.id) {
                const fromProject = projects.find(p => p.id === dragProjectId);
                const sheet = fromProject?.sheets.find(s => s.id === draggedSheetId);
                if (sheet) {
                  onSheetMoveConfirm(dragProjectId, project.id, project.name, draggedSheetId, sheet.name);
                }
              }
              setDraggedProjectIndex(null);
              setDragOverProjectIndex(null);
              setDraggedSheetIndex(null);
              setDraggedSheetId(null);
              setDragProjectId(null);
              setDragOverProjectId(null);
            }}
          >
            <div
              tabIndex={0}
              className={cn(
                'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors border focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]',
                dragOverProjectIndex === projectIndex && 'ring-2 ring-blue-400',
                dragOverProjectId === project.id && 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900/20'
              )}
              style={{
                background: dragOverProjectId === project.id
                  ? undefined
                  : currentProjectId === project.id ? 'var(--accent-light)' : 'transparent',
                color: currentProjectId === project.id ? 'var(--accent)' : 'var(--text-secondary)',
                borderColor: currentProjectId === project.id ? 'var(--accent)' : 'var(--border-primary)',
                opacity: draggedProjectIndex === projectIndex ? 0.5 : 1,
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onProjectContextMenu(e, project.id, project.name);
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Delete' || e.key === 'Backspace') && editingProjectId !== project.id) {
                  e.preventDefault();
                  e.stopPropagation();
                  onProjectDelete(project.id, project.name);
                }
              }}
            >
              <button
                onClick={() => toggleProject(project.id)}
                className="p-0.5 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                {expandedProjects.has(project.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {editingProjectId === project.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEdit();
                    if (e.key === 'Escape') {
                      setEditingProjectId(null);
                      setEditName('');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-2 py-1 text-sm rounded"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => {
                    setCurrentProject(project.id);
                    if (!expandedProjects.has(project.id)) toggleProject(project.id);
                  }}
                  className="flex-1 text-sm font-medium truncate"
                >
                  {project.name}
                </span>
              )}
            </div>

            {expandedProjects.has(project.id) && (
              <div className="ml-5 mt-0.5 space-y-0.5">
                {project.sheets.map((sheet, index) => (
                  <div
                    key={sheet.id}
                    draggable={editingSheetId !== sheet.id}
                    onDragStart={(e) => {
                      if (editingSheetId === sheet.id) return;
                      setDraggedSheetIndex(index);
                      setDraggedSheetId(sheet.id);
                      setDragProjectId(project.id);
                      e.dataTransfer.setData('application/x-sheet-id', sheet.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedSheetIndex(null);
                      setDraggedSheetId(null);
                      setDragOverIndex(null);
                      setDragProjectId(null);
                      setDragOverProjectId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragProjectId === project.id) {
                        setDragOverIndex(index);
                      }
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedSheetIndex !== null && dragProjectId === project.id && draggedSheetIndex !== index) {
                        reorderSheets(project.id, draggedSheetIndex, index);
                      }
                      setDraggedSheetIndex(null);
                      setDraggedSheetId(null);
                      setDragOverIndex(null);
                      setDragProjectId(null);
                    }}
                    onClick={() => {
                      if (editingSheetId !== sheet.id) {
                        setCurrentProject(project.id);
                        setCurrentSheet(sheet.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSheetContextMenu(e, project.id, sheet.id, sheet.name, sheet.exportClassName);
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Delete' || e.key === 'Backspace') && editingSheetId !== sheet.id) {
                        e.preventDefault();
                        e.stopPropagation();
                        onSheetDelete(project.id, sheet.id, sheet.name);
                      }
                    }}
                    tabIndex={0}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors group focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]",
                      dragOverIndex === index && dragProjectId === project.id && "ring-2 ring-blue-400"
                    )}
                    style={{
                      background: currentSheetId === sheet.id ? 'var(--accent)' :
                                 (draggedSheetIndex === index && dragProjectId === project.id) ? 'var(--bg-tertiary)' : 'transparent',
                      color: currentSheetId === sheet.id ? 'white' : 'var(--text-primary)',
                      opacity: draggedSheetIndex === index && dragProjectId === project.id ? 0.5 : 1,
                    }}
                  >
                    <GripVertical
                      className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing flex-shrink-0"
                    />
                    <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                    {editingSheetId === sheet.id ? (
                      <input
                        type="text"
                        value={editSheetName}
                        onChange={(e) => setEditSheetName(e.target.value)}
                        onBlur={() => {
                          if (editSheetName.trim()) {
                            updateSheet(project.id, sheet.id, { name: editSheetName.trim() });
                          }
                          setEditingSheetId(null);
                          setEditSheetName('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editSheetName.trim()) {
                              updateSheet(project.id, sheet.id, { name: editSheetName.trim() });
                            }
                            setEditingSheetId(null);
                            setEditSheetName('');
                          }
                          if (e.key === 'Escape') {
                            setEditingSheetId(null);
                            setEditSheetName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 px-1 py-0.5 text-sm rounded"
                        style={{
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)'
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="truncate flex-1">
                        {sheet.name}
                        {sheet.exportClassName && (
                          <span style={{ color: 'var(--text-tertiary)' }}> | {sheet.exportClassName}</span>
                        )}
                      </span>
                    )}
                  </div>
                ))}
                {project.sheets.length === 0 && (
                  <div className="text-xs px-2 py-1.5" style={{ color: 'var(--text-tertiary)' }}>{t('sidebar.noSheet')}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
