'use client';

import { useState, useRef, useEffect } from 'react';
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
  FileJson,
  FileText,
  ChevronUp,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { exportToJSON, importFromJSON, exportSheetToCSV, saveAllProjects, deleteProjectFromDB } from '@/lib/storage';
import { downloadFile, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

interface SidebarProps {
  onShowChart: () => void;
  onShowHelp: () => void;
  onShowCalculator: () => void;
  onShowComparison: () => void;
  onShowReferences: () => void;
}

export default function Sidebar({ onShowChart, onShowHelp, onShowCalculator, onShowComparison, onShowReferences }: SidebarProps) {
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
    loadProjects,
    selectedRows,
    clearSelectedRows,
    reorderSheets,
  } = useProjectStore();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setShowImportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleExportJSON = () => {
    const json = exportToJSON(projects);
    downloadFile(json, `indiebalancing-${new Date().toISOString().slice(0, 10)}.json`);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    if (!currentSheet) {
      alert('내보낼 시트를 먼저 선택해주세요.');
      return;
    }
    const csv = exportSheetToCSV(currentSheet);
    const projectName = currentProject?.name || 'project';
    downloadFile(csv, `${projectName}-${currentSheet.name}.csv`, 'text/csv');
    setShowExportMenu(false);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = importFromJSON(text);
        loadProjects([...projects, ...imported]);
        await saveAllProjects([...projects, ...imported]);
        alert(`${imported.length}개의 프로젝트를 가져왔습니다.`);
      } catch {
        alert('파일을 가져올 수 없습니다. 올바른 형식인지 확인해주세요.');
      }
    };
    input.click();
    setShowImportMenu(false);
  };

  return (
    <div className="w-64 flex flex-col h-full border-r" style={{
      background: 'var(--bg-primary)',
      borderColor: 'var(--border-primary)'
    }}>
      {/* 헤더 */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
        <span className="font-semibold" style={{ color: 'var(--accent)' }}>인디밸런싱</span>
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
              placeholder="프로젝트 이름"
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
            새 프로젝트
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
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>프로젝트가 없습니다</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>새 프로젝트를 만들어보세요</p>
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
                      <div className="hidden group-hover:flex items-center gap-0.5">
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
                            if (confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) {
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
                        draggable
                        onDragStart={(e) => {
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
                          setCurrentProject(project.id);
                          setCurrentSheet(sheet.id);
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
                        <span className="truncate">{sheet.name}</span>
                      </div>
                    ))}
                    {project.sheets.length === 0 && (
                      <div className="text-xs px-2 py-1.5" style={{ color: 'var(--text-tertiary)' }}>시트 없음</div>
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
              {selectedRows.length}개 선택됨
            </span>
            <button
              onClick={clearSelectedRows}
              className="text-xs px-2 py-1 rounded font-medium transition-colors"
              style={{
                color: 'var(--accent)',
                background: 'var(--bg-primary)'
              }}
            >
              해제
            </button>
          </div>
        </div>
      )}

      {/* 도구 */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="text-[10px] font-medium uppercase tracking-wider px-2 mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          도구
        </div>
        <div className="space-y-0.5">
          <ToolButton icon={Calculator} label="계산기" onClick={onShowCalculator} badge={selectedRows.length} />
          <ToolButton icon={PieChart} label="비교 분석" onClick={onShowComparison} badge={selectedRows.length} />
          <ToolButton icon={BarChart3} label="성장 곡선" onClick={onShowChart} />
        </div>
      </div>

      {/* 데이터 */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex gap-2">
          {/* 내보내기 드롭다운 */}
          <div className="flex-1 relative" ref={exportMenuRef}>
            <button
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowImportMenu(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)'
              }}
            >
              <Download className="w-4 h-4" />
              내보내기
              <ChevronUp className={`w-3 h-3 transition-transform ${showExportMenu ? '' : 'rotate-180'}`} />
            </button>
            {showExportMenu && (
              <div
                className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border shadow-lg overflow-hidden animate-fadeIn"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)'
                }}
              >
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <FileJson className="w-4 h-4" style={{ color: 'var(--primary-blue)' }} />
                  <div>
                    <div className="font-medium">JSON 내보내기</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>모든 프로젝트 · 수식 포함</div>
                  </div>
                </button>
                <div style={{ borderTop: '1px solid var(--border-primary)' }} />
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left"
                  style={{
                    color: currentSheet ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                    opacity: currentSheet ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <FileText className="w-4 h-4" style={{ color: 'var(--success)' }} />
                  <div>
                    <div className="font-medium">CSV 내보내기</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {currentSheet ? `현재 시트만 · 계산된 값` : '시트를 먼저 선택하세요'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 가져오기 드롭다운 */}
          <div className="flex-1 relative" ref={importMenuRef}>
            <button
              onClick={() => {
                setShowImportMenu(!showImportMenu);
                setShowExportMenu(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)'
              }}
            >
              <Upload className="w-4 h-4" />
              가져오기
              <ChevronUp className={`w-3 h-3 transition-transform ${showImportMenu ? '' : 'rotate-180'}`} />
            </button>
            {showImportMenu && (
              <div
                className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border shadow-lg overflow-hidden animate-fadeIn"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)'
                }}
              >
                <button
                  onClick={handleImportJSON}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <FileJson className="w-4 h-4" style={{ color: 'var(--primary-blue)' }} />
                  <div>
                    <div className="font-medium">JSON 가져오기</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>프로젝트 추가 · 기존 데이터 유지</div>
                  </div>
                </button>
                <div style={{ borderTop: '1px solid var(--border-primary)' }} />
                <div
                  className="flex items-center gap-2 px-3 py-2.5 text-sm"
                  style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}
                >
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium">CSV 가져오기</div>
                    <div className="text-xs">추후 지원 예정</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 - 도움말 */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowHelp}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}
          >
            <HelpCircle className="w-4 h-4" />
            가이드
          </button>
          <button
            onClick={onShowReferences}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}
          >
            <BookOpen className="w-4 h-4" />
            참고자료
          </button>
        </div>
      </div>

      {/* 저장 상태 */}
      {lastSaved && (
        <div className="px-4 py-2.5 border-t text-xs flex items-center gap-2" style={{
          borderColor: 'var(--border-primary)',
          color: 'var(--text-tertiary)'
        }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          저장됨 · {formatRelativeTime(lastSaved)}
        </div>
      )}
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  badge
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--accent-light)' }}
      >
        <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      </div>
      <span className="flex-1 text-left font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="px-1.5 py-0.5 text-xs font-medium rounded"
          style={{
            background: 'var(--accent)',
            color: 'white'
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
