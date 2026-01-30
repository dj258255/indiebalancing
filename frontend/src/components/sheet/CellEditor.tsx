'use client';

/**
 * CellEditor - 인라인 셀 에디터 (Google Sheets 스타일)
 *
 * Google Sheets 편집 모드 스타일:
 * - 셀 외곽에 파란색 테두리가 **추가로** 씌워지는 형태
 * - 에디터가 셀보다 테두리 두께만큼 약간 크게 표시됨
 * - 셀 위를 완전히 덮으면서 테두리가 바깥으로 확장
 */

import React, { forwardRef, useEffect, useRef } from 'react';
import type { CellStyle } from '@/types';

interface CellEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e?: React.FocusEvent<HTMLInputElement>) => void;
  isFormula?: boolean;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  cellStyle?: CellStyle;
}

export const CellEditor = forwardRef<HTMLInputElement, CellEditorProps>(
  ({ value, onChange, onKeyDown, onBlur, isFormula = false, position, cellStyle }, ref) => {
    const internalInputRef = useRef<HTMLInputElement>(null);

    // 값이 변경될 때마다 커서가 보이도록 스크롤
    useEffect(() => {
      const input = internalInputRef.current;
      if (input) {
        requestAnimationFrame(() => {
          input.scrollLeft = input.scrollWidth;
        });
      }
    }, [value]);

    // 테두리 두께 - 셀 외곽에 추가되는 테두리
    const borderWidth = 2;

    return (
      <input
        ref={(node) => {
          internalInputRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className="absolute z-50"
        style={{
          // Google Sheets 스타일: 셀 외곽에 테두리 추가
          // 테두리가 셀 바깥으로 확장되도록 위치 조정
          top: position.top - borderWidth,
          left: position.left - borderWidth,
          // 내부 영역은 셀과 동일하게, 테두리는 외곽에 추가
          width: position.width + borderWidth * 2,
          height: position.height + borderWidth * 2,
          // 셀과 동일한 패딩 (SheetCell의 px-2 = 8px)
          padding: '0 8px',
          // 셀 외곽을 감싸는 테두리
          border: `${borderWidth}px solid ${isFormula ? 'var(--editor-border-formula)' : 'var(--editor-border-focus)'}`,
          borderRadius: '0',
          outline: 'none',
          background: isFormula ? 'var(--editor-bg-formula)' : 'var(--editor-bg)',
          boxShadow: isFormula
            ? '0 0 0 3px var(--editor-shadow-formula)'
            : '0 0 0 3px var(--editor-shadow-focus)',
          // 셀 스타일 상속
          color: cellStyle?.fontColor || 'var(--text-primary)',
          fontSize: cellStyle?.fontSize ? `${cellStyle.fontSize}px` : '13px',
          fontFamily: isFormula ? 'var(--font-mono, monospace)' : 'inherit',
          fontWeight: cellStyle?.bold ? 'bold' : 'normal',
          fontStyle: cellStyle?.italic ? 'italic' : 'normal',
          textDecoration: [
            cellStyle?.underline ? 'underline' : '',
            cellStyle?.strikethrough ? 'line-through' : '',
          ].filter(Boolean).join(' ') || 'none',
          boxSizing: 'border-box',
          caretColor: isFormula ? 'var(--editor-border-formula)' : 'var(--editor-border-focus)',
        }}
        autoComplete="off"
        spellCheck={false}
      />
    );
  }
);

CellEditor.displayName = 'CellEditor';
