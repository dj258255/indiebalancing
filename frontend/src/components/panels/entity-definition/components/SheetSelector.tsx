'use client';

import { FileSpreadsheet, FolderOpen, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Sheet, Project } from '@/types';

interface SheetSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  sheets: Sheet[];
  selectedSheetId: string | null;
  onProjectSelect: (projectId: string) => void;
  onSheetSelect: (sheetId: string | null) => void;
}

export default function SheetSelector({
  projects,
  selectedProjectId,
  sheets,
  selectedSheetId,
  onProjectSelect,
  onSheetSelect,
}: SheetSelectorProps) {
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedSheet = sheets.find(s => s.id === selectedSheetId);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
      }
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        setIsSheetOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (projects.length === 0) {
    return (
      <div
        className="p-3 rounded-lg text-center text-sm"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
      >
        프로젝트가 없습니다. 새 프로젝트를 만들어주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
        소스 시트 선택
      </div>

      <div className="flex gap-2">
        {/* 프로젝트 선택 */}
        <div className="flex-1 relative" ref={projectRef}>
          <button
            onClick={() => setIsProjectOpen(!isProjectOpen)}
            className="w-full p-3 rounded-lg flex items-center gap-2 transition-all"
            style={{
              background: 'var(--bg-secondary)',
              border: `1px solid ${isProjectOpen ? 'var(--accent)' : 'var(--border-primary)'}`,
            }}
          >
            <FolderOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>프로젝트</div>
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {selectedProject?.name || '선택하세요'}
              </div>
            </div>
            <ChevronDown
              className="w-4 h-4 shrink-0 transition-transform"
              style={{
                color: 'var(--text-tertiary)',
                transform: isProjectOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {isProjectOpen && (
            <div
              className="absolute z-20 w-full mt-1 rounded-lg overflow-hidden shadow-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <div className="max-h-48 overflow-y-auto scrollbar-slim">
                {projects.map((project) => {
                  const isSelected = project.id === selectedProjectId;
                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        onProjectSelect(project.id);
                        setIsProjectOpen(false);
                      }}
                      className="w-full p-3 flex items-center gap-2 transition-colors"
                      style={{
                        background: isSelected ? 'var(--accent-light)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <FolderOpen
                        className="w-4 h-4 shrink-0"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)' }}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div
                          className="text-sm truncate"
                          style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                        >
                          {project.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {project.sheets.length}개 시트
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 시트 선택 */}
        <div className="flex-1 relative" ref={sheetRef}>
          <button
            onClick={() => sheets.length > 0 && setIsSheetOpen(!isSheetOpen)}
            disabled={sheets.length === 0}
            className="w-full p-3 rounded-lg flex items-center gap-2 transition-all"
            style={{
              background: 'var(--bg-secondary)',
              border: `1px solid ${isSheetOpen ? 'var(--accent)' : 'var(--border-primary)'}`,
              opacity: sheets.length === 0 ? 0.5 : 1,
              cursor: sheets.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>시트</div>
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {sheets.length === 0
                  ? '시트 없음'
                  : selectedSheet?.name || '선택하세요'}
              </div>
            </div>
            <ChevronDown
              className="w-4 h-4 shrink-0 transition-transform"
              style={{
                color: 'var(--text-tertiary)',
                transform: isSheetOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {isSheetOpen && sheets.length > 0 && (
            <div
              className="absolute z-20 w-full mt-1 rounded-lg overflow-hidden shadow-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <div className="max-h-48 overflow-y-auto scrollbar-slim">
                {sheets.map((sheet) => {
                  const isSelected = sheet.id === selectedSheetId;
                  return (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        onSheetSelect(sheet.id);
                        setIsSheetOpen(false);
                      }}
                      className="w-full p-3 flex items-center gap-2 transition-colors"
                      style={{
                        background: isSelected ? 'var(--accent-light)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <FileSpreadsheet
                        className="w-4 h-4 shrink-0"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)' }}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div
                          className="text-sm truncate"
                          style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                        >
                          {sheet.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {sheet.rows.length}행 × {sheet.columns.length}열
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
