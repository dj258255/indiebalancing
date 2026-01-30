/**
 * z-index 체계
 *
 * 일관된 레이어링을 위한 z-index 상수 정의
 */

export const Z_INDEX = {
  // 컴포넌트 내부 요소 (0-10)
  INTERNAL: {
    BASE: 0,
    RESIZE_HANDLE: 5,
    HOVER: 10,
  },

  // 헤더, 스티키 요소 (20)
  HEADER: 20,

  // 하단 툴바 (30-40)
  BOTTOM_TOOLBAR: 40,
  DROPDOWN_BACKDROP: 40,

  // 드롭다운, 팝오버, 컨텍스트 메뉴 (50)
  DROPDOWN: 50,
  POPOVER: 50,
  CONTEXT_MENU: 50,

  // 시트 관련 오버레이 (60)
  CELL_EDITOR: 60,
  SHEET_CONTEXT_MENU: 60,

  // 고정 UI (100)
  MOBILE_HEADER: 100,
  FIXED_TOOLTIP: 100,

  // 드래그 앤 드롭 (200)
  DRAG_DROP: 200,

  // 풀스크린 차트/모달 (1000)
  FULLSCREEN: 1000,

  // 최상위 모달 (1100)
  MODAL: 1100,

  // 시스템 알림, 토스트 (1200)
  TOAST: 1200,
} as const;
