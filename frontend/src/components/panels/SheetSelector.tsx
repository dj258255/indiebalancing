'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import type { Sheet } from '@/types';

interface SheetSelectorProps {
  selectedSheetId: string | null;
  onSheetChange: (sheetId: string) => void;
  label?: string;
  color?: string;
  className?: string;
}

export default function SheetSelector({
  selectedSheetId,
  onSheetChange,
  label = '분석할 시트',
  color = '#3db88a',
  className,
}: SheetSelectorProps) {
  const { projects, currentProjectId } = useProjectStore();
  const currentProject = projects.find(p => p.id === currentProjectId);
  const sheets = currentProject?.sheets || [];

  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedSheet = sheets.find(s => s.id === selectedSheetId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 시트가 없으면 안내 메시지
  if (sheets.length === 0) {
    return (
      <div className={cn('glass-card p-4', className)}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <FileSpreadsheet className="w-4 h-4" />
          <span>프로젝트에 시트가 없습니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card p-4', className)}>
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          <FileSpreadsheet className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
          <div ref={selectRef} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full glass-input flex items-center justify-between gap-2 text-sm px-3 py-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="truncate font-medium">
                {selectedSheet?.name || '시트를 선택하세요'}
              </span>
              <ChevronDown
                className={cn('w-4 h-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                style={{ color: 'var(--text-secondary)' }}
              />
            </button>
            {isOpen && (
              <div
                className="absolute z-50 w-full mt-1 py-1 rounded-xl shadow-lg border overflow-hidden max-h-60 overflow-y-auto"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                {sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    onClick={() => {
                      onSheetChange(sheet.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between',
                      sheet.id === selectedSheetId
                        ? 'font-medium'
                        : 'hover:bg-[var(--bg-secondary)]'
                    )}
                    style={{
                      color: sheet.id === selectedSheetId ? color : 'var(--text-primary)',
                      background: sheet.id === selectedSheetId ? `${color}15` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                      <span>{sheet.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        ({sheet.rows.length}행)
                      </span>
                    </div>
                    {sheet.id === selectedSheetId && (
                      <Check className="w-4 h-4" style={{ color }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 다중 시트 선택 버전
interface MultiSheetSelectorProps {
  selectedSheetIds: string[];
  onSheetChange: (sheetIds: string[]) => void;
  label?: string;
  color?: string;
  className?: string;
  maxSelection?: number;
}

export function MultiSheetSelector({
  selectedSheetIds,
  onSheetChange,
  label = '비교할 시트',
  color = '#3db88a',
  className,
  maxSelection = 5,
}: MultiSheetSelectorProps) {
  const { projects, currentProjectId } = useProjectStore();
  const currentProject = projects.find(p => p.id === currentProjectId);
  const sheets = currentProject?.sheets || [];

  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedSheets = sheets.filter(s => selectedSheetIds.includes(s.id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSheet = (sheetId: string) => {
    if (selectedSheetIds.includes(sheetId)) {
      onSheetChange(selectedSheetIds.filter(id => id !== sheetId));
    } else if (selectedSheetIds.length < maxSelection) {
      onSheetChange([...selectedSheetIds, sheetId]);
    }
  };

  if (sheets.length === 0) {
    return (
      <div className={cn('glass-card p-4', className)}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <FileSpreadsheet className="w-4 h-4" />
          <span>프로젝트에 시트가 없습니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card p-4', className)}>
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          <FileSpreadsheet className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            {label} ({selectedSheetIds.length}/{maxSelection})
          </label>
          <div ref={selectRef} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full glass-input flex items-center justify-between gap-2 text-sm px-3 py-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="truncate font-medium">
                {selectedSheets.length > 0
                  ? selectedSheets.map(s => s.name).join(', ')
                  : '시트를 선택하세요'}
              </span>
              <ChevronDown
                className={cn('w-4 h-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                style={{ color: 'var(--text-secondary)' }}
              />
            </button>
            {isOpen && (
              <div
                className="absolute z-50 w-full mt-1 py-1 rounded-xl shadow-lg border overflow-hidden max-h-60 overflow-y-auto"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                {sheets.map((sheet) => {
                  const isSelected = selectedSheetIds.includes(sheet.id);
                  const isDisabled = !isSelected && selectedSheetIds.length >= maxSelection;

                  return (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => !isDisabled && toggleSheet(sheet.id)}
                      disabled={isDisabled}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between',
                        isDisabled && 'opacity-40 cursor-not-allowed',
                        isSelected ? 'font-medium' : 'hover:bg-[var(--bg-secondary)]'
                      )}
                      style={{
                        color: isSelected ? color : 'var(--text-primary)',
                        background: isSelected ? `${color}15` : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-all',
                            isSelected ? 'border-transparent' : 'border-[var(--border-primary)]'
                          )}
                          style={{
                            background: isSelected ? color : 'var(--bg-tertiary)',
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <span>{sheet.name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          ({sheet.rows.length}행)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
