'use client';

import { useCallback, useState, useRef, useEffect, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Undo2,
  Redo2,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  RotateCcw,
  ChevronDown,
  History,
  StickyNote,
} from 'lucide-react';
import { useSheetUIStore } from '@/stores/sheetUIStore';
import { useHistoryStore } from '@/stores/historyStore';
import type { CellStyle } from '@/types';

// 폰트 사이즈 옵션 (x-spreadsheet 패턴)
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36];

// 텍스트 회전 옵션
const TEXT_ROTATIONS = [
  { value: 0, label: '0°' },
  { value: 45, label: '45°' },
  { value: 90, label: '90°' },
  { value: -45, label: '-45°' },
  { value: -90, label: '-90°' },
];

// 툴팁 컴포넌트
interface TooltipProps {
  children: ReactNode;
  label: string;
  shortcut?: string;
}

function Tooltip({ children, label, shortcut }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
        setShow(true);
      }
    }, 400); // 400ms 딜레이
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-flex"
    >
      {children}
      {show && (
        <div
          className="fixed z-[100] px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translateX(-50%)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        >
          <span>{label}</span>
          {shortcut && (
            <span
              className="ml-2 px-1 py-0.5 rounded text-[10px]"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}
            >
              {shortcut}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface SheetToolbarProps {
  onStyleChange?: (style: Partial<CellStyle>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddMemo?: () => void;
  disabled?: boolean;
}

export default function SheetToolbar({
  onStyleChange,
  onUndo,
  onRedo,
  onAddMemo,
  disabled = false,
}: SheetToolbarProps) {
  const t = useTranslations();
  const {
    zoomLevel,
    setZoom,
    zoomIn,
    zoomOut,
    currentCellStyle,
    updateCurrentCellStyle,
  } = useSheetUIStore();
  const { canUndo, canRedo, getHistory } = useHistoryStore();
  const { past, future } = getHistory();

  // 히스토리 드롭다운 상태
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 스타일 토글 핸들러 (x-spreadsheet ToggleItem 패턴)
  const handleToggleStyle = useCallback(
    (key: keyof CellStyle) => {
      const newValue = !currentCellStyle[key];
      updateCurrentCellStyle({ [key]: newValue });
      onStyleChange?.({ [key]: newValue });
    },
    [currentCellStyle, updateCurrentCellStyle, onStyleChange]
  );

  // 폰트 사이즈 변경
  const handleFontSizeChange = useCallback(
    (size: number) => {
      updateCurrentCellStyle({ fontSize: size });
      onStyleChange?.({ fontSize: size });
    },
    [updateCurrentCellStyle, onStyleChange]
  );

  // 폰트 사이즈 증감
  const handleFontSizeStep = useCallback(
    (delta: number) => {
      const currentSize = currentCellStyle.fontSize || 12;
      const currentIndex = FONT_SIZES.findIndex((s) => s >= currentSize);
      const newIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, currentIndex + delta));
      handleFontSizeChange(FONT_SIZES[newIndex]);
    },
    [currentCellStyle.fontSize, handleFontSizeChange]
  );

  // 정렬 변경
  const handleAlignChange = useCallback(
    (hAlign: CellStyle['hAlign']) => {
      updateCurrentCellStyle({ hAlign });
      onStyleChange?.({ hAlign });
    },
    [updateCurrentCellStyle, onStyleChange]
  );

  // 세로 정렬 변경
  const handleVAlignChange = useCallback(
    (vAlign: CellStyle['vAlign']) => {
      updateCurrentCellStyle({ vAlign });
      onStyleChange?.({ vAlign });
    },
    [updateCurrentCellStyle, onStyleChange]
  );

  // 텍스트 회전 변경
  const handleRotationChange = useCallback(
    (rotation: number) => {
      updateCurrentCellStyle({ textRotation: rotation });
      onStyleChange?.({ textRotation: rotation });
    },
    [updateCurrentCellStyle, onStyleChange]
  );

  // Undo/Redo 핸들러
  const handleUndo = useCallback(() => {
    onUndo?.();
  }, [onUndo]);

  const handleRedo = useCallback(() => {
    onRedo?.();
  }, [onRedo]);

  // 줌 퍼센트 표시
  const zoomPercent = Math.round(zoomLevel * 100);

  // 버튼 스타일
  const buttonClass = `p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed`;
  const activeClass = `bg-[var(--primary-blue-light)]`;
  const hoverClass = `hover:bg-[var(--bg-hover)]`;

  // 구분선 컴포넌트
  const Divider = () => (
    <div className="w-px h-6 mx-1" style={{ background: 'var(--border-primary)' }} />
  );

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1.5 border-b flex-wrap"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Undo/Redo (x-spreadsheet 패턴) */}
      <Tooltip label={t('toolbar.undo')} shortcut="Ctrl+Z">
        <button
          onClick={handleUndo}
          disabled={disabled || !canUndo()}
          className={`${buttonClass} ${hoverClass}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Undo2 className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.redo')} shortcut="Ctrl+Y">
        <button
          onClick={handleRedo}
          disabled={disabled || !canRedo()}
          className={`${buttonClass} ${hoverClass}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* 히스토리 드롭다운 */}
      <div className="relative" ref={historyRef}>
        <Tooltip label={t('toolbar.history')}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            disabled={disabled || (past.length === 0 && future.length === 0)}
            className={`${buttonClass} ${hoverClass} flex items-center gap-0.5`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <History className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>
        </Tooltip>

        {showHistory && (past.length > 0 || future.length > 0) && (
          <div
            className="absolute top-full left-0 mt-1 min-w-[200px] max-h-[300px] overflow-y-auto rounded-lg shadow-lg border z-50"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            {/* Undo 히스토리 */}
            {past.length > 0 && (
              <div className="p-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <div
                  className="text-xs font-medium mb-1 px-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('toolbar.undoHistory')} ({past.length})
                </div>
                {[...past].reverse().slice(0, 10).map((item, index) => (
                  <div
                    key={`undo-${index}`}
                    className="px-2 py-1.5 text-xs rounded hover:bg-[var(--bg-hover)] cursor-default flex items-center gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Undo2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="truncate">
                      {item.label} - {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Redo 히스토리 */}
            {future.length > 0 && (
              <div className="p-2">
                <div
                  className="text-xs font-medium mb-1 px-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('toolbar.redoHistory')} ({future.length})
                </div>
                {[...future].slice(0, 10).map((item, index) => (
                  <div
                    key={`redo-${index}`}
                    className="px-2 py-1.5 text-xs rounded hover:bg-[var(--bg-hover)] cursor-default flex items-center gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Redo2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="truncate">
                      {item.label} - {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 히스토리 없음 */}
            {past.length === 0 && future.length === 0 && (
              <div className="p-4 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                {t('toolbar.noHistory')}
              </div>
            )}
          </div>
        )}
      </div>

      <Divider />

      {/* 폰트 사이즈 (x-spreadsheet FontSize 패턴) */}
      <div className="flex items-center gap-0.5">
        <Tooltip label={t('toolbar.decreaseFontSize')}>
          <button
            onClick={() => handleFontSizeStep(-1)}
            disabled={disabled}
            className={`${buttonClass} ${hoverClass}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Minus className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip label={t('toolbar.fontSize')}>
          <div className="relative">
            <select
              value={currentCellStyle.fontSize || 12}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              disabled={disabled}
              className="appearance-none pl-2 pr-6 py-1 text-xs font-medium rounded border cursor-pointer min-w-[50px] text-center"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
            />
          </div>
        </Tooltip>
        <Tooltip label={t('toolbar.increaseFontSize')}>
          <button
            onClick={() => handleFontSizeStep(1)}
            disabled={disabled}
            className={`${buttonClass} ${hoverClass}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      <Divider />

      {/* 텍스트 스타일 (x-spreadsheet Bold/Italic/Underline/Strike 패턴) */}
      <Tooltip label={t('toolbar.bold')} shortcut="Ctrl+B">
        <button
          onClick={() => handleToggleStyle('bold')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.bold ? activeClass : ''}`}
          style={{ color: currentCellStyle.bold ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <Bold className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.italic')} shortcut="Ctrl+I">
        <button
          onClick={() => handleToggleStyle('italic')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.italic ? activeClass : ''}`}
          style={{ color: currentCellStyle.italic ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <Italic className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.underline')} shortcut="Ctrl+U">
        <button
          onClick={() => handleToggleStyle('underline')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.underline ? activeClass : ''}`}
          style={{ color: currentCellStyle.underline ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <Underline className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.strikethrough')}>
        <button
          onClick={() => handleToggleStyle('strikethrough')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.strikethrough ? activeClass : ''}`}
          style={{ color: currentCellStyle.strikethrough ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </Tooltip>

      <Divider />

      {/* 가로 정렬 (x-spreadsheet Align 패턴) */}
      <Tooltip label={t('toolbar.alignLeft')}>
        <button
          onClick={() => handleAlignChange('left')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.hAlign === 'left' ? activeClass : ''}`}
          style={{ color: currentCellStyle.hAlign === 'left' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <AlignLeft className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.alignCenter')}>
        <button
          onClick={() => handleAlignChange('center')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.hAlign === 'center' ? activeClass : ''}`}
          style={{ color: currentCellStyle.hAlign === 'center' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <AlignCenter className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.alignRight')}>
        <button
          onClick={() => handleAlignChange('right')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.hAlign === 'right' ? activeClass : ''}`}
          style={{ color: currentCellStyle.hAlign === 'right' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </Tooltip>

      <Divider />

      {/* 세로 정렬 (x-spreadsheet Valign 패턴) */}
      <Tooltip label={t('toolbar.alignTop')}>
        <button
          onClick={() => handleVAlignChange('top')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.vAlign === 'top' ? activeClass : ''}`}
          style={{ color: currentCellStyle.vAlign === 'top' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <AlignVerticalJustifyStart className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.alignMiddle')}>
        <button
          onClick={() => handleVAlignChange('middle')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.vAlign === 'middle' ? activeClass : ''}`}
          style={{ color: currentCellStyle.vAlign === 'middle' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <AlignVerticalJustifyCenter className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.alignBottom')}>
        <button
          onClick={() => handleVAlignChange('bottom')}
          disabled={disabled}
          className={`${buttonClass} ${hoverClass} ${currentCellStyle.vAlign === 'bottom' ? activeClass : ''}`}
          style={{ color: currentCellStyle.vAlign === 'bottom' ? 'var(--primary-blue)' : 'var(--text-secondary)' }}
        >
          <AlignVerticalJustifyEnd className="w-4 h-4" />
        </button>
      </Tooltip>

      <Divider />

      {/* 텍스트 회전 */}
      <Tooltip label={t('toolbar.textRotation')}>
        <div className="relative">
          <select
            value={currentCellStyle.textRotation || 0}
            onChange={(e) => handleRotationChange(Number(e.target.value))}
            disabled={disabled}
            className="appearance-none pl-2 pr-6 py-1 text-xs rounded border cursor-pointer"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            {TEXT_ROTATIONS.map((rot) => (
              <option key={rot.value} value={rot.value}>
                {rot.label}
              </option>
            ))}
          </select>
          <RotateCcw
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
        </div>
      </Tooltip>

      <Divider />

      {/* 메모 버튼 */}
      <Tooltip label={t('common.memo')}>
        <button
          onClick={onAddMemo}
          className={`${buttonClass} ${hoverClass} flex items-center gap-1`}
          style={{ background: '#fef08a', color: '#92400e' }}
        >
          <StickyNote className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* 스페이서 */}
      <div className="flex-1" />

      {/* 줌 컨트롤 (Luckysheet zoomRatio 패턴) */}
      <div className="flex items-center gap-1">
        <Tooltip label={t('toolbar.zoomOut')}>
          <button
            onClick={zoomOut}
            disabled={zoomLevel <= 0.5}
            className={`${buttonClass} ${hoverClass}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Minus className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip label={t('toolbar.zoom')}>
          <div className="relative">
            <select
              value={zoomLevel}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="appearance-none pl-2 pr-6 py-1 text-xs font-medium rounded border cursor-pointer min-w-[65px] text-center"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value={0.5}>50%</option>
              <option value={0.75}>75%</option>
              <option value={1.0}>100%</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
              <option value={1.75}>175%</option>
              <option value={2.0}>200%</option>
            </select>
            <ChevronDown
              className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
            />
          </div>
        </Tooltip>
        <Tooltip label={t('toolbar.zoomIn')}>
          <button
            onClick={zoomIn}
            disabled={zoomLevel >= 2.0}
            className={`${buttonClass} ${hoverClass}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
