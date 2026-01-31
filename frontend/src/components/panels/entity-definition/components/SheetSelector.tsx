'use client';

import { FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Sheet } from '@/types';

interface SheetSelectorProps {
  sheets: Sheet[];
  selectedSheetId: string | null;
  onSelect: (sheetId: string | null) => void;
}

export default function SheetSelector({
  sheets,
  selectedSheetId,
  onSelect,
}: SheetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSheet = sheets.find(s => s.id === selectedSheetId);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (sheets.length === 0) {
    return (
      <div
        className="p-3 rounded-lg text-center text-sm"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
      >
        프로젝트에 시트가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
        소스 시트 선택
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3 rounded-lg flex items-center gap-3 transition-all"
          style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border-primary)'}`,
          }}
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div className="flex-1 text-left">
            {selectedSheet ? (
              <>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {selectedSheet.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {selectedSheet.rows.length}행 × {selectedSheet.columns.length}열
                </div>
              </>
            ) : (
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                시트를 선택하세요
              </div>
            )}
          </div>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{
              color: 'var(--text-tertiary)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {isOpen && (
          <div
            className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden shadow-lg"
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
                      onSelect(sheet.id);
                      setIsOpen(false);
                    }}
                    className="w-full p-3 flex items-center gap-3 transition-colors"
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
                      className="w-4 h-4"
                      style={{ color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    />
                    <div className="flex-1 text-left">
                      <div
                        className="text-sm"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                      >
                        {sheet.name}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {sheet.rows.length}행 × {sheet.columns.length}열
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
