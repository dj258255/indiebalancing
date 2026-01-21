'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { deleteProjectFromDB } from '@/lib/storage';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui';
import { useTranslations, useLocale } from 'next-intl';

interface SidebarProps {
  onShowChart: () => void;
  onShowHelp: () => void;
  onShowCalculator: () => void;
  onShowComparison: () => void;
  onShowReferences: () => void;
  onShowPresetComparison?: () => void;
  onShowGameEngineExport?: () => void;
  onShowGameEngineImport?: () => void;
  onShowImbalanceDetector?: () => void;
  onShowGoalSolver?: () => void;
  onShowBalanceAnalysis?: () => void;
  onShowSettings?: () => void;
  onShowExportModal?: () => void;
  onShowImportModal?: () => void;
}

export default function Sidebar({
  onShowChart,
  onShowHelp,
  onShowCalculator,
  onShowComparison,
  onShowReferences,
  onShowPresetComparison,
  onShowGameEngineExport,
  onShowGameEngineImport,
  onShowImbalanceDetector,
  onShowGoalSolver,
  onShowBalanceAnalysis,
  onShowSettings,
  onShowExportModal,
  onShowImportModal,
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
    updateProject,
    updateSheet,
    deleteSheet,
    selectedRows,
    clearSelectedRows,
    reorderSheets,
  } = useProjectStore();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editSheetName, setEditSheetName] = useState('');

  const t = useTranslations();
  const locale = useLocale();

  // 드래그 앤 드롭 상태
  const [draggedSheetIndex, setDraggedSheetIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);

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
    <div className="w-56 lg:w-64 flex flex-col h-full border-r shrink-0" style={{
      background: 'var(--bg-primary)',
      borderColor: 'var(--border-primary)'
    }}>
      {/* 헤더 */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
        <span className="font-semibold" style={{ color: 'var(--accent)' }}>{t('app.name')}</span>
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
          <div className="space-y-0.5">
            {projects.map((project) => (
              <div key={project.id}>
                <div
                  className={cn(
                    'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors'
                  )}
                  style={{
                    background: currentProjectId === project.id ? 'var(--accent-light)' : 'transparent',
                    color: currentProjectId === project.id ? 'var(--accent)' : 'var(--text-secondary)',
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
                    <>
                      <span
                        onClick={() => {
                          setCurrentProject(project.id);
                          if (!expandedProjects.has(project.id)) toggleProject(project.id);
                        }}
                        className="flex-1 text-sm font-medium truncate"
                      >
                        {project.name}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(project.id, project.name);
                          }}
                          className="p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(t('project.deleteConfirm', { name: project.name }))) {
                              deleteProject(project.id);
                              await deleteProjectFromDB(project.id);
                            }
                          }}
                          className="p-1 rounded transition-colors hover:text-red-500"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
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
                          setDragProjectId(project.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedSheetIndex(null);
                          setDragOverIndex(null);
                          setDragProjectId(null);
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
                          if (draggedSheetIndex !== null && dragProjectId === project.id && draggedSheetIndex !== index) {
                            reorderSheets(project.id, draggedSheetIndex, index);
                          }
                          setDraggedSheetIndex(null);
                          setDragOverIndex(null);
                          setDragProjectId(null);
                        }}
                        onClick={() => {
                          if (editingSheetId !== sheet.id) {
                            setCurrentProject(project.id);
                            setCurrentSheet(sheet.id);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors group",
                          dragOverIndex === index && dragProjectId === project.id && "ring-2 ring-blue-400"
                        )}
                        style={{
                          background: currentSheetId === sheet.id ? 'var(--accent)' :
                                     (draggedSheetIndex === index && dragProjectId === project.id) ? 'var(--bg-tertiary)' : 'transparent',
                          color: currentSheetId === sheet.id ? 'white' : 'var(--text-tertiary)',
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
                          <>
                            <span className="truncate flex-1">{sheet.name}</span>
                            <div className={cn(
                              "items-center gap-0.5 flex-shrink-0",
                              currentSheetId === sheet.id ? "flex" : "hidden group-hover:flex"
                            )}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSheetId(sheet.id);
                                  setEditSheetName(sheet.name);
                                }}
                                className="p-0.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                title={t('sheet.rename')}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(t('alert.deleteSheetConfirm', { name: sheet.name }))) {
                                    deleteSheet(project.id, sheet.id);
                                  }
                                }}
                                className="p-0.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 hover:text-red-500"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
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

      {/* 도구 - 스크롤 가능 */}
      <div className="border-t p-2 flex flex-col" style={{ borderColor: 'var(--border-primary)', maxHeight: '280px' }}>
        <div className="text-[10px] font-medium uppercase tracking-wider px-2 mb-1.5 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {t('sidebar.tools')}
        </div>
        <div className="space-y-0.5 overflow-y-auto flex-1 pr-1">
          <ToolButton icon={Calculator} label={t('sidebar.calculator')} onClick={onShowCalculator} badge={selectedRows.length} color="#8b5cf6" />
          <ToolButton icon={PieChart} label={t('sidebar.comparison')} onClick={onShowComparison} badge={selectedRows.length} color="#3b82f6" />
          <ToolButton icon={BarChart3} label={t('sidebar.chart')} onClick={onShowChart} color="#22c55e" />
          {onShowPresetComparison && (
            <ToolButton icon={GitCompare} label={t('sidebar.presetComparison')} onClick={onShowPresetComparison} color="#f97316" />
          )}
          {onShowImbalanceDetector && (
            <ToolButton icon={AlertTriangle} label={t('sidebar.imbalanceDetector')} onClick={onShowImbalanceDetector} color="#eab308" />
          )}
          {onShowGoalSolver && (
            <ToolButton icon={Target} label={t('sidebar.goalSolver')} onClick={onShowGoalSolver} color="#14b8a6" />
          )}
          {onShowBalanceAnalysis && (
            <ToolButton icon={TrendingUp} label={t('sidebar.balanceAnalysis')} onClick={onShowBalanceAnalysis} color="#ec4899" />
          )}
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
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  badge,
  color
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  badge?: number;
  color?: string;
}) {
  const iconColor = color || 'var(--accent)';
  return (
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
    </button>
  );
}
