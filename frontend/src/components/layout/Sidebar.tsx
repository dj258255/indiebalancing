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
  Activity,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useToolLayoutStore, AllToolId } from '@/stores/toolLayoutStore';
import { deleteProjectFromDB } from '@/lib/storage';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ThemeToggle, ConfirmDialog } from '@/components/ui';
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
  // 활성화된 도구 상태
  activeTools?: {
    calculator?: boolean;
    comparison?: boolean;
    chart?: boolean;
    presetComparison?: boolean;
    imbalanceDetector?: boolean;
    goalSolver?: boolean;
    balanceAnalysis?: boolean;
    economy?: boolean;
    dpsVariance?: boolean;
    curveFitting?: boolean;
    formulaHelper?: boolean;
    balanceValidator?: boolean;
    difficultyCurve?: boolean;
    simulation?: boolean;
  };
}

// 도구 설정
const TOOL_CONFIG: Record<string, { icon: typeof Calculator; color: string; labelKey: string }> = {
  calculator: { icon: Calculator, color: '#8b5cf6', labelKey: 'sidebar.calculator' },
  comparison: { icon: PieChart, color: '#3b82f6', labelKey: 'sidebar.comparison' },
  chart: { icon: BarChart3, color: '#22c55e', labelKey: 'sidebar.chart' },
  presetComparison: { icon: GitCompare, color: '#f97316', labelKey: 'sidebar.presetComparison' },
  imbalanceDetector: { icon: AlertTriangle, color: '#eab308', labelKey: 'sidebar.imbalanceDetector' },
  goalSolver: { icon: Target, color: '#14b8a6', labelKey: 'sidebar.goalSolver' },
  balanceAnalysis: { icon: Activity, color: '#ec4899', labelKey: 'sidebar.balanceAnalysis' },
  economy: { icon: Coins, color: '#f59e0b', labelKey: 'sidebar.economy' },
  dpsVariance: { icon: BarChart2, color: '#f97316', labelKey: 'sidebar.dpsVariance' },
  curveFitting: { icon: PenTool, color: '#6366f1', labelKey: 'sidebar.curveFitting' },
  formulaHelper: { icon: FunctionSquare, color: '#3b82f6', labelKey: 'bottomTabs.formulaHelper' },
  balanceValidator: { icon: Shield, color: '#22c55e', labelKey: 'bottomTabs.balanceValidator' },
  difficultyCurve: { icon: TrendingUp, color: '#8b5cf6', labelKey: 'bottomTabs.difficultyCurve' },
  simulation: { icon: Swords, color: '#ef4444', labelKey: 'bottomTabs.simulation' },
};

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
  activeTools = {},
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
    getAllTools,
    reorderSidebarTools,
    moveToolToLocation,
    sidebarWidth,
    toolsSectionHeight,
    setToolsSectionHeight,
  } = useToolLayoutStore();

  // 클라이언트 마운트 후에만 저장된 값 사용 (SSR 하이드레이션 불일치 방지)
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    // 모바일 감지
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const effectiveWidth = mounted ? sidebarWidth : 256;
  const effectiveToolsHeight = mounted ? toolsSectionHeight : 200;

  // 드래그 상태 - 단순화
  const [dragState, setDragState] = useState<{
    draggedToolId: AllToolId | null;
    draggedFromSidebar: boolean;
    dropTargetIndex: number | null;
    isOverSidebar: boolean;
  }>({
    draggedToolId: null,
    draggedFromSidebar: false,
    dropTargetIndex: null,
    isOverSidebar: false,
  });

  const toolsContainerRef = useRef<HTMLDivElement>(null);

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

  // ConfirmDialog 상태
  const [sheetMoveConfirm, setSheetMoveConfirm] = useState<{
    fromProjectId: string;
    toProjectId: string;
    toProjectName: string;
    sheetId: string;
    sheetName: string;
  } | null>(null);
  const [sheetDeleteConfirm, setSheetDeleteConfirm] = useState<{
    projectId: string;
    sheetId: string;
    sheetName: string;
  } | null>(null);
  const [projectDeleteConfirm, setProjectDeleteConfirm] = useState<{
    projectId: string;
    projectName: string;
  } | null>(null);

  // 도구 클릭 핸들러 매핑
  const toolClickHandlers: Record<string, (() => void) | undefined> = {
    calculator: onShowCalculator,
    comparison: onShowComparison,
    chart: onShowChart,
    presetComparison: onShowPresetComparison,
    imbalanceDetector: onShowImbalanceDetector,
    goalSolver: onShowGoalSolver,
    balanceAnalysis: onShowBalanceAnalysis,
    economy: onShowEconomy,
    dpsVariance: onShowDpsVariance,
    curveFitting: onShowCurveFitting,
    formulaHelper: onToggleFormulaHelper,
    balanceValidator: onToggleBalanceValidator,
    difficultyCurve: onToggleDifficultyCurve,
    simulation: onToggleSimulation,
  };

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

  // 전역 드래그 이벤트 감지
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDragState({
        draggedToolId: null,
        draggedFromSidebar: false,
        dropTargetIndex: null,
        isOverSidebar: false,
      });
    };

    document.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

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

  // 도구 드래그 시작
  const handleToolDragStart = (e: React.DragEvent, toolId: AllToolId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', toolId);
    e.dataTransfer.setData('application/x-tool-id', toolId);
    // 사이드바에서 드래그 시작임을 표시 (독에서 온 것이 아님)

    setDragState({
      draggedToolId: toolId,
      draggedFromSidebar: true,
      dropTargetIndex: null,
      isOverSidebar: false,
    });
  };

  // 도구 섹션 드래그 오버
  const handleToolsSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!e.dataTransfer.types.includes('application/x-tool-id')) return;

    // 독바에서 오는 드래그인지 확인
    const isFromDock = e.dataTransfer.types.includes('application/x-from-dock');

    // 드롭 위치 계산
    if (toolsContainerRef.current) {
      const rect = toolsContainerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const itemHeight = 48; // 아이템 높이 + 간격
      const currentSidebarTools = getSidebarTools();

      let targetIndex = Math.floor(y / itemHeight);
      targetIndex = Math.max(0, Math.min(targetIndex, currentSidebarTools.length));

      setDragState(prev => ({
        ...prev,
        isOverSidebar: true,
        dropTargetIndex: targetIndex,
        // 독바에서 드래그해서 사이드바로 들어온 경우에도 draggedFromSidebar를 false로 설정
        draggedFromSidebar: isFromDock ? false : prev.draggedFromSidebar,
      }));
    }
  };

  // 도구 섹션 드래그 리브
  const handleToolsSectionDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragState(prev => ({ ...prev, isOverSidebar: false, dropTargetIndex: null }));
  };

  // 도구 드롭 처리
  const handleToolsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const toolId = e.dataTransfer.getData('text/plain') as AllToolId;
    const isFromDock = e.dataTransfer.types.includes('application/x-from-dock');

    if (!toolId) {
      setDragState({
        draggedToolId: null,
        draggedFromSidebar: false,
        dropTargetIndex: null,
        isOverSidebar: false,
      });
      return;
    }

    const { dropTargetIndex, draggedFromSidebar } = dragState;
    const sidebarTools = getSidebarTools();

    if (isFromDock) {
      // 독에서 사이드바로 이동 (드롭 위치에 삽입)
      moveToolToLocation(toolId, 'sidebar', dropTargetIndex ?? undefined);
    } else if (draggedFromSidebar) {
      // 사이드바 내에서 순서 변경
      const fromIndex = sidebarTools.indexOf(toolId);
      if (fromIndex !== -1 && dropTargetIndex !== null && fromIndex !== dropTargetIndex) {
        // dropTargetIndex는 "이 위치 앞에 삽입" 의미
        // reorderSidebarTools는 fromIndex를 제거한 후 toIndex에 삽입
        // 따라서 fromIndex가 dropTargetIndex보다 작으면 (위에서 아래로 이동)
        // 제거 후 인덱스가 1 줄어들므로 -1 필요
        let toIndex = dropTargetIndex;
        if (fromIndex < dropTargetIndex) {
          toIndex = dropTargetIndex - 1;
        }
        reorderSidebarTools(fromIndex, toIndex);
      }
    }

    setDragState({
      draggedToolId: null,
      draggedFromSidebar: false,
      dropTargetIndex: null,
      isOverSidebar: false,
    });
  };

  // 밀림 효과 계산
  const getToolTransformY = (index: number, toolId: AllToolId) => {
    const { draggedToolId, draggedFromSidebar, dropTargetIndex, isOverSidebar } = dragState;
    const currentSidebarTools = getSidebarTools();

    if (dropTargetIndex === null) return 0;

    if (draggedFromSidebar && draggedToolId) {
      // 사이드바 내에서 드래그 중
      if (draggedToolId === toolId) return 0; // 드래그 중인 아이템 자체

      const draggedIndex = currentSidebarTools.indexOf(draggedToolId);

      if (draggedIndex < dropTargetIndex) {
        // 아래로 이동: 드래그 아이템과 드롭 위치 사이의 아이템들은 위로
        if (index > draggedIndex && index < dropTargetIndex) {
          return -48;
        }
      } else if (draggedIndex > dropTargetIndex) {
        // 위로 이동: 드래그 아이템과 드롭 위치 사이의 아이템들은 아래로
        if (index < draggedIndex && index >= dropTargetIndex) {
          return 48;
        }
      }
    } else if (isOverSidebar && !draggedFromSidebar) {
      // 독에서 사이드바로 드래그 중 (외부에서 들어옴)
      if (index >= dropTargetIndex) {
        return 48; // 드롭 위치 이후의 모든 아이템은 아래로
      }
    }

    return 0;
  };

  // 현재 프로젝트와 시트 가져오기
  const currentProject = projects.find(p => p.id === currentProjectId);

  // 모바일에서는 모든 도구 표시 (하단 독바가 숨겨지므로)
  const sidebarTools = isMobile ? getAllTools() : getSidebarTools();

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
                    if (sheet) {
                      setSheetMoveConfirm({
                        fromProjectId: dragProjectId,
                        toProjectId: project.id,
                        toProjectName: project.name,
                        sheetId: draggedSheetId,
                        sheetName: sheet.name,
                      });
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

      {/* 도구 섹션 */}
      <div
        id="sidebar-tools-section"
        className="p-2 flex flex-col shrink-0"
        style={{ height: `${effectiveToolsHeight}px`, minHeight: '60px', maxHeight: '600px' }}
        onDragOver={handleToolsSectionDragOver}
        onDragLeave={handleToolsSectionDragLeave}
        onDrop={handleToolsDrop}
      >
        <div className="flex items-center gap-2 px-2.5 mb-2 shrink-0">
          <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('sidebar.tools')}
          </div>
          <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
        </div>
        <div ref={toolsContainerRef} className="space-y-1 overflow-y-auto flex-1 pr-1 scrollbar-visible">
          {sidebarTools.map((toolId, index) => {
            const config = TOOL_CONFIG[toolId];
            if (!config) return null;

            const Icon = config.icon;
            const onClick = toolClickHandlers[toolId];
            if (!onClick) return null;

            const isActive = activeTools[toolId as keyof typeof activeTools];
            const isDragging = dragState.draggedToolId === toolId && dragState.draggedFromSidebar;
            const translateY = getToolTransformY(index, toolId);

            return (
              <div
                key={toolId}
                draggable
                onDragStart={(e) => handleToolDragStart(e, toolId)}
                className={cn(
                  "group cursor-grab active:cursor-grabbing rounded-lg relative",
                  isDragging && "opacity-30 z-50"
                )}
                style={{
                  transform: `translateY(${translateY}px)`,
                  transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
                }}
              >
                <button
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 text-sm rounded-lg transition-colors duration-150 hover:bg-[var(--bg-hover)] active:scale-[0.98]"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                    style={{ background: `${config.color}20` }}
                  >
                    <Icon className="w-[18px] h-[18px]" style={{ color: config.color }} />
                  </div>
                  <span
                    className="flex-1 text-left font-semibold truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t(config.labelKey)}
                  </span>
                  {isActive && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200"
                      style={{ background: config.color }}
                    />
                  )}
                  {toolId === 'calculator' && selectedRows.length > 0 && (
                    <span
                      className="px-2 py-0.5 text-xs font-bold rounded-md shrink-0"
                      style={{ background: config.color, color: 'white' }}
                    >
                      {selectedRows.length}
                    </span>
                  )}
                  {toolId === 'comparison' && selectedRows.length > 0 && (
                    <span
                      className="px-2 py-0.5 text-xs font-bold rounded-md shrink-0"
                      style={{ background: config.color, color: 'white' }}
                    >
                      {selectedRows.length}
                    </span>
                  )}
                  <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>
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
              setSheetDeleteConfirm({
                projectId: sheetContextMenu.projectId,
                sheetId: sheetContextMenu.sheetId,
                sheetName: sheetContextMenu.sheetName,
              });
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
            onClick={() => {
              setProjectDeleteConfirm({
                projectId: projectContextMenu.projectId,
                projectName: projectContextMenu.projectName,
              });
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

      {/* 시트 이동 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={!!sheetMoveConfirm}
        onClose={() => setSheetMoveConfirm(null)}
        onConfirm={() => {
          if (sheetMoveConfirm) {
            moveSheetToProject(sheetMoveConfirm.fromProjectId, sheetMoveConfirm.toProjectId, sheetMoveConfirm.sheetId);
          }
        }}
        title={t('sheet.moveSheet')}
        message={t('sheet.moveConfirm', { sheetName: sheetMoveConfirm?.sheetName || '', projectName: sheetMoveConfirm?.toProjectName || '' })}
        confirmText={t('common.move')}
        cancelText={t('common.cancel')}
        variant="warning"
      />

      {/* 시트 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={!!sheetDeleteConfirm}
        onClose={() => setSheetDeleteConfirm(null)}
        onConfirm={() => {
          if (sheetDeleteConfirm) {
            deleteSheet(sheetDeleteConfirm.projectId, sheetDeleteConfirm.sheetId);
          }
        }}
        title={t('sheet.deleteSheet')}
        message={t('alert.deleteSheetConfirm', { name: sheetDeleteConfirm?.sheetName || '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
      />

      {/* 프로젝트 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={!!projectDeleteConfirm}
        onClose={() => setProjectDeleteConfirm(null)}
        onConfirm={async () => {
          if (projectDeleteConfirm) {
            deleteProject(projectDeleteConfirm.projectId);
            await deleteProjectFromDB(projectDeleteConfirm.projectId);
          }
        }}
        title={t('project.deleteProject')}
        message={t('project.deleteConfirm', { name: projectDeleteConfirm?.projectName || '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
      />
    </>
  );
}
