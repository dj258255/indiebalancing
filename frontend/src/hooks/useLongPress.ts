/**
 * useLongPress Hook - 롱프레스 감지
 *
 * 모바일에서 우클릭 대신 롱프레스(길게 누르기)로 컨텍스트 메뉴 표시
 *
 * 참고:
 * - Google Sheets 모바일: 500ms 롱프레스로 컨텍스트 메뉴 표시
 * - AG Grid: 롱프레스로 헤더 메뉴 표시
 * - https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
 */

import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  /** 롱프레스 인식 시간 (ms) - 기본 500ms */
  delay?: number;
  /** 롱프레스 발동 시 콜백 */
  onLongPress: (e: React.PointerEvent) => void;
  /** 일반 클릭 시 콜백 (선택) */
  onClick?: (e: React.PointerEvent) => void;
  /** 이동 허용 거리 (px) - 초과 시 롱프레스 취소 */
  moveTolerance?: number;
}

interface UseLongPressReturn {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
}

export function useLongPress({
  delay = 500,
  onLongPress,
  onClick,
  moveTolerance = 10,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressedRef = useRef(false);
  const eventRef = useRef<React.PointerEvent | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    eventRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 터치와 펜만 롱프레스 지원 (마우스는 우클릭 사용)
      if (e.pointerType === 'mouse') return;

      isLongPressedRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      eventRef.current = e;

      timerRef.current = setTimeout(() => {
        isLongPressedRef.current = true;
        if (eventRef.current) {
          onLongPress(eventRef.current);
        }
      }, delay);
    },
    [delay, onLongPress]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // 마우스는 무시
      if (e.pointerType === 'mouse') {
        if (onClick) onClick(e);
        return;
      }

      // 롱프레스가 아니면 일반 클릭
      if (!isLongPressedRef.current && onClick) {
        onClick(e);
      }

      clear();
    },
    [onClick, clear]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current || e.pointerType === 'mouse') return;

      // 이동 거리 계산
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 이동 허용 범위 초과 시 롱프레스 취소
      if (distance > moveTolerance) {
        clear();
      }
    },
    [moveTolerance, clear]
  );

  const handlePointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  const handlePointerLeave = useCallback(() => {
    clear();
  }, [clear]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerMove: handlePointerMove,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerLeave,
  };
}

export default useLongPress;
