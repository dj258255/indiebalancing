'use client';

/**
 * MobileSelectionHandles - 모바일용 셀 선택 핸들
 *
 * Google Sheets 모바일 스타일의 파란 원형 핸들
 * - 좌상단/우하단에 핸들 표시
 * - 드래그로 선택 범위 확장
 *
 * 참고:
 * - Google Sheets Mobile: https://www.thebricks.com/resources/guide-how-to-drag-cells-in-google-sheets-mobile
 * - 터치 타겟 최소 44x44px (Apple HIG)
 */

import React, { useCallback, useRef } from 'react';

interface MobileSelectionHandlesProps {
  /** 선택 영역 위치 (px) */
  selectionRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  /** 핸들 드래그 시작 콜백 */
  onHandleDragStart: (handle: 'topLeft' | 'bottomRight', e: React.PointerEvent) => void;
  /** 핸들 드래그 중 콜백 */
  onHandleDrag: (e: PointerEvent) => void;
  /** 핸들 드래그 종료 콜백 */
  onHandleDragEnd: () => void;
  /** 표시 여부 (모바일에서만 표시) */
  visible: boolean;
}

export function MobileSelectionHandles({
  selectionRect,
  onHandleDragStart,
  onHandleDrag,
  onHandleDragEnd,
  visible,
}: MobileSelectionHandlesProps) {
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (handle: 'topLeft' | 'bottomRight', e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 터치 디바이스에서 포인터 캡처
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isDraggingRef.current = true;

      onHandleDragStart(handle, e);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;
        onHandleDrag(moveEvent);
      };

      const handlePointerUp = () => {
        isDraggingRef.current = false;
        onHandleDragEnd();
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    },
    [onHandleDragStart, onHandleDrag, onHandleDragEnd]
  );

  if (!visible || !selectionRect) return null;

  const { top, left, width, height } = selectionRect;

  // 핸들 크기 (터치 타겟 최소 44px 보장)
  const handleSize = 20;
  const hitAreaSize = 44;
  const handleOffset = handleSize / 2;

  return (
    <>
      {/* 좌상단 핸들 */}
      <div
        className="mobile-selection-handle top-left"
        style={{
          position: 'absolute',
          top: top - handleOffset,
          left: left - handleOffset,
          width: handleSize,
          height: handleSize,
          // 터치 영역 확장
          padding: (hitAreaSize - handleSize) / 2,
          margin: -(hitAreaSize - handleSize) / 2,
          boxSizing: 'content-box',
        }}
        onPointerDown={(e) => handlePointerDown('topLeft', e)}
      />

      {/* 우하단 핸들 */}
      <div
        className="mobile-selection-handle bottom-right"
        style={{
          position: 'absolute',
          top: top + height - handleOffset,
          left: left + width - handleOffset,
          width: handleSize,
          height: handleSize,
          // 터치 영역 확장
          padding: (hitAreaSize - handleSize) / 2,
          margin: -(hitAreaSize - handleSize) / 2,
          boxSizing: 'content-box',
        }}
        onPointerDown={(e) => handlePointerDown('bottomRight', e)}
      />
    </>
  );
}

export default MobileSelectionHandles;
