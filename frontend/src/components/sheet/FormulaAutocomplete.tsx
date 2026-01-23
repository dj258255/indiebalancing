'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { availableFunctions } from '@/lib/formulaEngine';
import type { Column } from '@/types';

interface AutocompleteItem {
  type: 'function' | 'column';
  name: string;
  description: string;
  value: string; // 선택 시 삽입될 값
}

interface FormulaAutocompleteProps {
  value: string;
  onSelect: (text: string) => void;
  columns: Column[];
  onKeyDown?: (e: React.KeyboardEvent) => boolean; // true 반환 시 이벤트 소비됨
}

export default function FormulaAutocomplete({
  value,
  onSelect,
  columns,
}: FormulaAutocompleteProps) {
  const t = useTranslations();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const formulaText = value.startsWith('=') ? value.slice(1) : '';
  const lastWord = formulaText.split(/[\s()+\-*/,]/).pop()?.toUpperCase() || '';

  // 매칭되는 아이템들 계산
  const items: AutocompleteItem[] = [];

  if (lastWord && lastWord.length >= 1) {
    // 함수 매칭
    const matchingFunctions = availableFunctions.filter((f) =>
      f.name.toUpperCase().startsWith(lastWord)
    );
    matchingFunctions.slice(0, 5).forEach((func) => {
      items.push({
        type: 'function',
        name: func.name,
        description: func.description,
        value: value.slice(0, value.length - lastWord.length) + func.name + '(',
      });
    });

    // 컬럼 매칭
    const matchingColumns = columns.filter((c) =>
      c.name.toUpperCase().startsWith(lastWord)
    );
    matchingColumns.slice(0, 5).forEach((col) => {
      items.push({
        type: 'column',
        name: col.name,
        description: col.type === 'formula' ? t('formula.formulaType') : t('formula.generalType'),
        value: value.slice(0, value.length - lastWord.length) + col.name,
      });
    });
  }

  // 선택 인덱스 범위 제한
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // value 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIndex(0);
  }, [value]);

  // 키보드 이벤트 핸들러 (부모에서 호출)
  const handleKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
    if (items.length === 0) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      case 'Enter':
      case 'Tab':
        if (items[selectedIndex]) {
          e.preventDefault();
          onSelect(items[selectedIndex].value);
          return true;
        }
        return false;
      case 'Escape':
        return false; // Escape는 부모가 처리하도록
      default:
        return false;
    }
  }, [items, selectedIndex, onSelect]);

  // 컴포넌트가 마운트될 때 키보드 핸들러를 window에 노출
  useEffect(() => {
    // @ts-expect-error - 전역 함수로 노출
    window.__formulaAutocompleteKeyHandler = handleKeyDown;
    return () => {
      // @ts-expect-error - 정리
      delete window.__formulaAutocompleteKeyHandler;
    };
  }, [handleKeyDown]);

  if (items.length === 0) return null;

  // 함수와 컬럼 분리
  const functionItems = items.filter((item) => item.type === 'function');
  const columnItems = items.filter((item) => item.type === 'column');

  // 전체 인덱스 계산을 위한 함수
  const getGlobalIndex = (type: 'function' | 'column', localIndex: number) => {
    if (type === 'function') return localIndex;
    return functionItems.length + localIndex;
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-50 w-72 max-h-48 overflow-y-auto"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
    >
      {functionItems.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            {t('formula.functions')}
          </div>
          {functionItems.map((item, localIndex) => {
            const globalIndex = getGlobalIndex('function', localIndex);
            const isSelected = globalIndex === selectedIndex;
            return (
              <button
                key={item.name}
                onClick={() => onSelect(item.value)}
                className="w-full text-left px-3 py-2 flex items-start gap-2 transition-colors"
                style={{
                  color: 'var(--text-primary)',
                  background: isSelected ? 'var(--primary-blue-light)' : 'transparent',
                }}
                onMouseEnter={() => setSelectedIndex(globalIndex)}
              >
                <code className="font-semibold text-sm" style={{ color: 'var(--primary-blue)' }}>{item.name}</code>
                <span className="text-xs flex-1" style={{ color: 'var(--text-tertiary)' }}>{item.description}</span>
              </button>
            );
          })}
        </div>
      )}
      {columnItems.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            {t('formula.columnRef')}
          </div>
          {columnItems.map((item, localIndex) => {
            const globalIndex = getGlobalIndex('column', localIndex);
            const isSelected = globalIndex === selectedIndex;
            return (
              <button
                key={item.name}
                onClick={() => onSelect(item.value)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
                style={{
                  color: 'var(--text-primary)',
                  background: isSelected ? 'var(--primary-green-light)' : 'transparent',
                }}
                onMouseEnter={() => setSelectedIndex(globalIndex)}
              >
                <span className="font-medium text-sm" style={{ color: 'var(--primary-green)' }}>{item.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  ({item.description})
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
