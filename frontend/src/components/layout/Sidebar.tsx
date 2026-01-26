'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FolderPlus,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Upload,
  BarChart3,
  HelpCircle,
  Calculator,
  PieChart,
  BookOpen,
  GripVertical,
  GitCompare,
  AlertTriangle,
  Target,
  TrendingUp,
  Globe,
  FunctionSquare,
  Shield,
  Swords,
  Copy,
  Coins,
  BarChart2,
  PenTool,
  Plus,
  Code,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useToolLayoutStore, AllToolId } from '@/stores/toolLayoutStore';
import { deleteProjectFromDB } from '@/lib/storage';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

interface SidebarProps {
  onShowChart: () => void;
  onShowHelp: () => void;
  onShowCalculator: () => void;
  onShowComparison: () => void;
  onShowReferences: () => void;
  onShowPresetComparison?: () => void;
  onShowImbalanceDetector?: () => void;
  onShowGoalSolver?: () => void;
  onShowBalanceAnalysis?: () => void;
  onShowEconomy?: () => void;
  onShowDpsVariance?: () => void;
  onShowCurveFitting?: () => void;
  onShowSettings?: () => void;
  onShowExportModal?: () => void;
  onShowImportModal?: () => void;
  // 패널 도구 토글
  onToggleFormulaHelper?: () => void;
  onToggleBalanceValidator?: () => void;
  onToggleDifficultyCurve?: () => void;
  onToggleSimulation?: () => void;
}

export default function Sidebar({
  onShowChart,
  onShowHelp,
  onShowCalculator,
  onShowComparison,
  onShowReferences,
  onShowPresetComparison,
  onShowImbalanceDetector,
  onShowGoalSolver,
  onShowBalanceAnalysis,
  onShowEconomy,
  onShowDpsVariance,
  onShowCurveFitting,
  onShowSettings,
  onShowExportModal,
  onShowImportModal,
  onToggleFormulaHelper,
  onToggleBalanceValidator,
  onToggleDifficultyCurve,
  onToggleSimulation,
}: SidebarProps) {
  const {
    projects,
    currentProjectId,
    currentSheetId,
    lastSaved,
    setCurrentProject,
    setCurrentSheet,
    createProject,
    deleteProject,
    duplicateProject,
    reorderProjects,
    updateProject,
    createSheet,
    updateSheet,
    deleteSheet,
    selectedRows,
    clearSelectedRows,
    reorderSheets,
    duplicateSheet,
    moveSheetToProject,
  } = useProjectStore();

  const {
    toolLocations,
    getSidebarTools,
    reorderSidebarTools,
    sidebarWidth,
    toolsSectionHeight,
    setToolsSectionHeight
  } = useToolLayoutStore();

  // 클라이언트 마운트 후에만 저장된 값 사용 (SSR 하이드레이션 불일치 방지)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const effectiveWidth = mounted ? sidebarWidth : 256;
  const effectiveToolsHeight = mounted ? toolsSectionHeight : 200;

  // 도구 드래그 앤 드롭 상태 (toolId 기반으로 변경)
  const [draggedToolId, setDraggedToolId] = useState<string | null>(null);
  const [dragOverToolId, setDragOverToolId] = useState<string | null>(null);

  // toolLocations가 변경되면 드래그 상태 초기화 (하단에서 사이드바로 이동 시)
  useEffect(() => {
    setDraggedToolId(null);
    setDragOverToolId(null);
  }, [toolLocations]);

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editSheetName, setEditSheetName] = useState('');

  const t = useTranslations();
  const locale = useLocale();
  const { theme } = useTheme();

  // 시트 드래그 앤 드롭 상태
  const [draggedSheetIndex, setDraggedSheetIndex] = useState<number | null>(null);
  const [draggedSheetId, setDraggedSheetId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);

  // 프로젝트 드래그 앤 드롭 상태
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);
  const [dragOverProjectIndex, setDragOverProjectIndex] = useState<number | null>(null);

  // 시트 컨텍스트 메뉴 상태
  const [sheetContextMenu, setSheetContextMenu] = useState<{
    x: number;
    y: number;
    projectId: string;
    sheetId: string;
    sheetName: string;
    exportClassName?: string;
  } | null>(null);
  const sheetContextMenuRef = useRef<HTMLDivElement>(null);

  // 클래스명 편집 상태
  const [editingClassNameSheetId, setEditingClassNameSheetId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');

  // 프로젝트 컨텍스트 메뉴 상태
  const [projectContextMenu, setProjectContextMenu] = useState<{
    x: number;
    y: number;
    projectId: string;
    projectName: string;
  } | null>(null);
  const projectContextMenuRef = useRef<HTMLDivElement>(null);

  // 도구 섹션 리사이즈 상태
  const [isResizingToolsSection, setIsResizingToolsSection] = useState(false);
  const toolsResizeStartY = useRef(0);
  const toolsResizeStartHeight = useRef(0);

  // 도구 섹션 리사이즈 핸들러
  const handleToolsResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingToolsSection(true);
    toolsResizeStartY.current = e.clientY;
    toolsResizeStartHeight.current = toolsSectionHeight;
  }, [toolsSectionHeight]);

  // 시트 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!sheetContextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (sheetContextMenuRef.current && !sheetContextMenuRef.current.contains(e.target as Node)) {
        setSheetContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sheetContextMenu]);

  // 프로젝트 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!projectContextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (projectContextMenuRef.current && !projectContextMenuRef.current.contains(e.target as Node)) {
        setProjectContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [projectContextMenu]);

  useEffect(() => {
    if (!isResizingToolsSection) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = toolsResizeStartY.current - e.clientY;
      const newHeight = Math.max(60, Math.min(600, toolsResizeStartHeight.current + deltaY));
      setToolsSectionHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingToolsSection(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingToolsSection]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      const id = createProject(newProjectName.trim());
      setExpandedProjects((prev) => new Set([...prev, id]));
      setNewProjectName('');
      setShowNewProject(false);
    }
  };

  const handleStartEdit = (projectId: string, name: string) => {
    setEditingProjectId(projectId);
    setEditName(name);
  };

  const handleFinishEdit = () => {
    if (editingProjectId && editName.trim()) {
      updateProject(editingProjectId, { name: editName.trim() });
    }
    setEditingProjectId(null);
    setEditName('');
  };

  // 현재 프로젝트와 시트 가져오기
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  return (
    <>
      {/* 도구 섹션 리사이즈 중 오버레이 */}
      {isResizingToolsSection && (
        <div className="fixed inset-0 z-50" style={{ cursor: 'ns-resize' }} />
      )}

      <div
        className="flex flex-col h-full border-r shrink-0 transition-opacity duration-150"
        style={{
          width: `${effectiveWidth}px`,
          background: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          opacity: mounted ? 1 : 0,
        }}
      >
      {/* 헤더 */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <Image src={theme === 'dark' ? '/icon-dark.svg' : '/icon.svg'} alt="Logo" width={24} height={24} className="rounded" />
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>{t('app.name')}</span>
        </div>
        <ThemeToggle />
      </div>

      {/* 새 프로젝트 */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        {showNewProject ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') {
                  setShowNewProject(false);
                  setNewProjectName('');
                }
              }}
              placeholder={t('project.projectName')}
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg"
              autoFocus
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleCreateProject}
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: 'white'
                }}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowNewProject(false);
                  setNewProjectName('');
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewProject(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'white'
            }}
          >
            <FolderPlus className="w-4 h-4" />
            {t('sidebar.newProject')}
          </button>
        )}
      </div>

      {/* 프로젝트 목록 */}
      <div className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{
              background: 'var(--accent-light)'
            }}>
              <FileSpreadsheet className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('project.noProject')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('project.createProject')}</p>
          </div>
        ) : (
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
                  // 프로젝트 드래그 중일 때만 프로젝트 순서 변경
                  if (draggedProjectIndex !== null) {
                    setDragOverProjectIndex(projectIndex);
                  }
                  // 시트 드래그 중일 때 다른 프로젝트로 이동
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
                  // 프로젝트 순서 변경
                  if (draggedProjectIndex !== null && draggedProjectIndex !== projectIndex) {
                    reorderProjects(draggedProjectIndex, projectIndex);
                  }
                  // 시트를 다른 프로젝트로 이동
                  if (draggedSheetId && dragProjectId && dragProjectId !== project.id) {
                    const fromProject = projects.find(p => p.id === dragProjectId);
                    const sheet = fromProject?.sheets.find(s => s.id === draggedSheetId);
                    if (sheet && confirm(t('sheet.moveConfirm', { sheetName: sheet.name, projectName: project.name }))) {
                      moveSheetToProject(dragProjectId, project.id, draggedSheetId);
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
                  className={cn(
                    'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors border',
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
                    setProjectContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      projectId: project.id,
                      projectName: project.name,
                    });
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
                        onDragLeave={() => {
                          setDragOverIndex(null);
                        }}
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
                          setSheetContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            projectId: project.id,
                            sheetId: sheet.id,
                            sheetName: sheet.name,
                            exportClassName: sheet.exportClassName,
                          });
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors group",
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
        )}
      </div>

      {/* 선택된 행 */}
      {selectedRows.length > 0 && (
        <div className="border-t px-3 py-2" style={{
          borderColor: 'var(--border-primary)',
          background: 'var(--accent-light)'
        }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              {t('sidebar.selectedRows', { count: selectedRows.length })}
            </span>
            <button
              onClick={clearSelectedRows}
              className="text-xs px-2 py-1 rounded font-medium transition-colors"
              style={{
                color: 'var(--accent)',
                background: 'var(--bg-primary)'
              }}
            >
              {t('sidebar.deselect')}
            </button>
          </div>
        </div>
      )}

      {/* 리사이즈 핸들 - 도구 섹션과 시트 목록 사이 */}
      <div
        className="h-1.5 cursor-ns-resize flex items-center justify-center group hover:bg-[var(--accent)]/10 transition-colors"
        style={{ borderTop: '1px solid var(--border-primary)' }}
        onMouseDown={handleToolsResizeStart}
      >
        <div
          className="w-8 h-0.5 rounded-full transition-colors group-hover:bg-[var(--accent)]"
          style={{ background: 'var(--border-secondary)' }}
        />
      </div>

      {/* 도구 - 스크롤 가능, 드래그로 하단에 추가 가능, 순서 변경 가능 */}
      <div
        id="sidebar-tools-section"
        className="p-2 flex flex-col shrink-0"
        style={{ height: `${effectiveToolsHeight}px`, minHeight: '60px', maxHeight: '600px' }}
      >
        <div className="text-[10px] font-medium uppercase tracking-wider px-2 mb-1.5 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {t('sidebar.tools')}
        </div>
        <div className="space-y-0.5 overflow-y-auto flex-1 pr-1">
          {/* 사이드바에 있는 도구들을 순서대로 표시 */}
          {getSidebarTools().map((toolId, index) => {
            const toolConfig: Record<string, { icon: typeof Calculator; color: string; labelKey: string; onClick?: () => void; badge?: number }> = {
              // 사이드바 도구
              calculator: { icon: Calculator, color: '#8b5cf6', labelKey: 'sidebar.calculator', onClick: onShowCalculator, badge: selectedRows.length },
              comparison: { icon: PieChart, color: '#3b82f6', labelKey: 'sidebar.comparison', onClick: onShowComparison, badge: selectedRows.length },
              chart: { icon: BarChart3, color: '#22c55e', labelKey: 'sidebar.chart', onClick: onShowChart },
              presetComparison: { icon: GitCompare, color: '#f97316', labelKey: 'sidebar.presetComparison', onClick: onShowPresetComparison },
              imbalanceDetector: { icon: AlertTriangle, color: '#eab308', labelKey: 'sidebar.imbalanceDetector', onClick: onShowImbalanceDetector },
              goalSolver: { icon: Target, color: '#14b8a6', labelKey: 'sidebar.goalSolver', onClick: onShowGoalSolver },
              balanceAnalysis: { icon: TrendingUp, color: '#ec4899', labelKey: 'sidebar.balanceAnalysis', onClick: onShowBalanceAnalysis },
              economy: { icon: Coins, color: '#f59e0b', labelKey: 'sidebar.economy', onClick: onShowEconomy },
              dpsVariance: { icon: BarChart2, color: '#f97316', labelKey: 'sidebar.dpsVariance', onClick: onShowDpsVariance },
              curveFitting: { icon: PenTool, color: '#6366f1', labelKey: 'sidebar.curveFitting', onClick: onShowCurveFitting },
              // 패널 도구 (하단에서 이동해온 경우)
              formulaHelper: { icon: FunctionSquare, color: '#3b82f6', labelKey: 'bottomTabs.formulaHelper', onClick: onToggleFormulaHelper },
              balanceValidator: { icon: Shield, color: '#22c55e', labelKey: 'bottomTabs.balanceValidator', onClick: onToggleBalanceValidator },
              difficultyCurve: { icon: TrendingUp, color: '#8b5cf6', labelKey: 'bottomTabs.difficultyCurve', onClick: onToggleDifficultyCurve },
              simulation: { icon: Swords, color: '#ef4444', labelKey: 'bottomTabs.simulation', onClick: onToggleSimulation },
            };

            const config = toolConfig[toolId];
            if (!config || !config.onClick) return null;

            return (
              <DraggableToolButton
                key={toolId}
                toolId={toolId as AllToolId}
                index={index}
                icon={config.icon}
                label={t(config.labelKey)}
                onClick={config.onClick}
                badge={config.badge}
                color={config.color}
                isDragging={draggedToolId === toolId}
                isDragOver={dragOverToolId === toolId}
                onDragStart={() => setDraggedToolId(toolId)}
                onDragOver={() => setDragOverToolId(toolId)}
                onDragEnd={() => {
                  // 사이드바 내에서 순서 변경
                  if (draggedToolId && dragOverToolId && draggedToolId !== dragOverToolId) {
                    const tools = getSidebarTools();
                    const fromIndex = tools.indexOf(draggedToolId as AllToolId);
                    const toIndex = tools.indexOf(dragOverToolId as AllToolId);
                    if (fromIndex !== -1 && toIndex !== -1) {
                      reorderSidebarTools(fromIndex, toIndex);
                    }
                  }
                  // 항상 상태 초기화 (하단으로 드롭했을 때도)
                  setDraggedToolId(null);
                  setDragOverToolId(null);
                }}
                onDragLeave={() => setDragOverToolId(null)}
              />
            );
          })}
        </div>
      </div>

      {/* 데이터 */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex gap-1.5 lg:gap-2">
          {/* 내보내기 버튼 */}
          <button
            onClick={onShowExportModal}
            className="flex-1 flex items-center justify-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap hover:bg-[var(--bg-hover)]"
            style={{
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-primary)'
            }}
          >
            <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span className="truncate">{t('common.export')}</span>
          </button>

          {/* 가져오기 버튼 */}
          <button
            onClick={onShowImportModal}
            className="flex-1 flex items-center justify-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap hover:bg-[var(--bg-hover)]"
            style={{
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-primary)'
            }}
          >
            <Upload className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span className="truncate">{t('common.import')}</span>
          </button>
        </div>
      </div>

      {/* 하단 - 도움말 및 설정 */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowHelp}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <HelpCircle className="w-4 h-4" />
            {t('sidebar.help')}
          </button>
          <button
            onClick={onShowReferences}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <BookOpen className="w-4 h-4" />
            {t('sidebar.references')}
          </button>
        </div>
      </div>

      {/* 저장 상태 및 설정 */}
      <div className="px-4 py-2.5 border-t text-xs flex items-center justify-between" style={{
        borderColor: 'var(--border-primary)',
        color: 'var(--text-tertiary)'
      }}>
        {lastSaved ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {t('sidebar.savedAt')} · {formatRelativeTime(lastSaved)}
          </div>
        ) : (
          <div />
        )}
        {onShowSettings && (
          <button
            onClick={onShowSettings}
            className="flex items-center gap-1 px-2 py-1 rounded border transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-primary)'
            }}
            title={t('sidebar.settings')}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{locale === 'ko' ? '한국어' : 'EN'}</span>
          </button>
        )}
      </div>
    </div>

      {/* 시트 컨텍스트 메뉴 */}
      {sheetContextMenu && (
        <div
          ref={sheetContextMenuRef}
          className="fixed z-50 min-w-[140px] py-1 rounded-lg shadow-lg border"
          style={{
            left: sheetContextMenu.x,
            top: sheetContextMenu.y,
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <button
            onClick={() => {
              setEditingSheetId(sheetContextMenu.sheetId);
              setEditSheetName(sheetContextMenu.sheetName);
              setSheetContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Edit2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            {t('sheet.rename')}
          </button>
          <button
            onClick={() => {
              setEditingClassNameSheetId(sheetContextMenu.sheetId);
              setEditClassName(sheetContextMenu.exportClassName || '');
              setSheetContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Code className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            {t('sheet.editClassName')}
          </button>
          <button
            onClick={() => {
              duplicateSheet(sheetContextMenu.projectId, sheetContextMenu.sheetId);
              setSheetContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Copy className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            {t('sheet.duplicate')}
          </button>
          <div className="my-1 border-t" style={{ borderColor: 'var(--border-primary)' }} />
          <button
            onClick={() => {
              if (confirm(t('alert.deleteSheetConfirm', { name: sheetContextMenu.sheetName }))) {
                deleteSheet(sheetContextMenu.projectId, sheetContextMenu.sheetId);
              }
              setSheetContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>
      )}

      {/* 클래스명 편집 모달 */}
      {editingClassNameSheetId && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999]">
          <div
            className="w-80 p-4 rounded-xl shadow-2xl"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('sheet.editClassName')}
            </h3>
            <input
              type="text"
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editClassName.trim()) {
                  const sheet = projects.flatMap(p => p.sheets).find(s => s.id === editingClassNameSheetId);
                  const project = projects.find(p => p.sheets.some(s => s.id === editingClassNameSheetId));
                  if (project) {
                    updateSheet(project.id, editingClassNameSheetId, { exportClassName: editClassName.trim() || undefined });
                  }
                  setEditingClassNameSheetId(null);
                  setEditClassName('');
                }
                if (e.key === 'Escape') {
                  setEditingClassNameSheetId(null);
                  setEditClassName('');
                }
              }}
              placeholder="CharacterStats"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none mb-2"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              {t('gameEngineExport.classNameHint')}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditingClassNameSheetId(null);
                  setEditClassName('');
                }}
                className="px-3 py-1.5 text-sm rounded-lg"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  const project = projects.find(p => p.sheets.some(s => s.id === editingClassNameSheetId));
                  if (project) {
                    updateSheet(project.id, editingClassNameSheetId, { exportClassName: editClassName.trim() || undefined });
                  }
                  setEditingClassNameSheetId(null);
                  setEditClassName('');
                }}
                className="px-3 py-1.5 text-sm rounded-lg"
                style={{ background: 'var(--primary-blue)', color: 'white' }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 컨텍스트 메뉴 */}
      {projectContextMenu && (
        <div
          ref={projectContextMenuRef}
          className="fixed z-50 min-w-[140px] py-1 rounded-lg shadow-lg border"
          style={{
            left: projectContextMenu.x,
            top: projectContextMenu.y,
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <button
            onClick={() => {
              createSheet(projectContextMenu.projectId, t('sheet.newSheet'));
              // 프로젝트 펼치기
              setExpandedProjects((prev) => new Set([...prev, projectContextMenu.projectId]));
              setProjectContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            {t('sheet.newSheet')}
          </button>
          <div className="my-1 border-t" style={{ borderColor: 'var(--border-primary)' }} />
          <button
            onClick={() => {
              handleStartEdit(projectContextMenu.projectId, projectContextMenu.projectName);
              setProjectContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Edit2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            {t('project.rename')}
          </button>
          <button
            onClick={() => {
              duplicateProject(projectContextMenu.projectId);
              setProjectContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Copy className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            {t('project.duplicate')}
          </button>
          <div className="my-1 border-t" style={{ borderColor: 'var(--border-primary)' }} />
          <button
            onClick={async () => {
              if (confirm(t('project.deleteConfirm', { name: projectContextMenu.projectName }))) {
                deleteProject(projectContextMenu.projectId);
                await deleteProjectFromDB(projectContextMenu.projectId);
              }
              setProjectContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  );
}

// 드래그 가능한 도구 버튼 (하단으로 드래그해서 이동 가능, 순서 변경 가능)
function DraggableToolButton({
  toolId,
  index,
  icon: Icon,
  label,
  onClick,
  badge,
  color,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave,
}: {
  toolId: AllToolId;
  index: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  badge?: number;
  color?: string;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDragEnd?: () => void;
  onDragLeave?: () => void;
}) {
  const iconColor = color || 'var(--accent)';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', toolId);
    e.dataTransfer.setData('application/x-tool-id', toolId); // 도구임을 식별하기 위한 커스텀 타입
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnd?.();
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing rounded-lg transition-all",
        isDragOver && "ring-2 ring-[var(--accent)] bg-[var(--accent-light)]"
      )}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color ? `${color}20` : 'var(--accent-light)' }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <span className="flex-1 text-left font-medium">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className="px-1.5 py-0.5 text-xs font-medium rounded"
            style={{
              background: iconColor,
              color: 'white'
            }}
          >
            {badge}
          </span>
        )}
        <GripVertical className="w-3 h-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
      </button>
    </div>
  );
}
