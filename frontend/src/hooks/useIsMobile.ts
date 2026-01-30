/**
 * useIsMobile Hook - 모바일 기기 감지
 *
 * 터치 기기 여부를 감지하여 모바일 전용 UI 표시 결정
 *
 * 참고:
 * - AG Grid: 터치 지원 여부로 모바일 UI 결정
 * - Pointer Events: pointerType으로 입력 방식 구분
 */

import { useState, useEffect } from 'react';

/**
 * 현재 디바이스가 터치를 지원하는지 확인
 */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - 레거시 IE/Edge 지원
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * 화면 너비가 모바일 크기인지 확인 (768px 이하)
 */
function isMobileWidth(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // 터치 지원 + 모바일 화면 크기
      setIsMobile(isTouchDevice() && isMobileWidth());
    };

    checkMobile();

    // 화면 크기 변경 시 재확인
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * 터치 기기 여부만 확인 (화면 크기 무관)
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  return isTouch;
}

export default useIsMobile;
