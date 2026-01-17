'use client';

import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-16 h-8 rounded-full transition-all duration-500 overflow-hidden shadow-md hover:shadow-lg hover:scale-105"
      style={{
        background: theme === 'light'
          ? 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 50%, #E0F4FF 100%)'
          : 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 50%, #3d3d5c 100%)',
      }}
      aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
    >
      {/* 배경 효과 - 라이트모드 구름 */}
      {theme === 'light' && (
        <>
          <div
            className="absolute transition-all duration-500"
            style={{
              right: '6px',
              top: '10px',
              width: '18px',
              height: '9px',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          />
          <div
            className="absolute transition-all duration-500"
            style={{
              right: '12px',
              top: '14px',
              width: '12px',
              height: '7px',
              background: 'rgba(255,255,255,0.8)',
              borderRadius: '6px',
            }}
          />
        </>
      )}

      {/* 배경 효과 - 다크모드 별 */}
      {theme === 'dark' && (
        <>
          <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ left: '10px', top: '8px', opacity: 0.8 }} />
          <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ left: '16px', top: '16px', opacity: 0.6 }} />
          <div className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ left: '6px', top: '20px', opacity: 0.7 }} />
          <div className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ left: '22px', top: '10px', opacity: 0.5 }} />
        </>
      )}

      {/* 태양/달 */}
      <div
        className="absolute top-1 transition-all duration-500 ease-in-out"
        style={{
          left: theme === 'light' ? '3px' : '35px',
          width: '24px',
          height: '24px',
        }}
      >
        {theme === 'light' ? (
          // 태양
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'linear-gradient(135deg, #FFD93D 0%, #F6B93B 50%, #E58E26 100%)',
              boxShadow: '0 0 20px rgba(255,217,61,0.6), inset -3px -3px 6px rgba(229,142,38,0.3)',
            }}
          />
        ) : (
          // 달
          <div
            className="w-full h-full rounded-full relative"
            style={{
              background: 'linear-gradient(135deg, #E8E8E8 0%, #D0D0D0 50%, #F5F5F5 100%)',
              boxShadow: '0 0 20px rgba(255,255,255,0.3), inset -2px -2px 6px rgba(200,200,200,0.5)',
            }}
          >
            {/* 달 크레이터 */}
            <div
              className="absolute rounded-full"
              style={{
                width: '6px',
                height: '6px',
                background: 'rgba(180,180,180,0.4)',
                top: '4px',
                left: '6px',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: '4px',
                height: '4px',
                background: 'rgba(180,180,180,0.3)',
                top: '12px',
                left: '12px',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: '3px',
                height: '3px',
                background: 'rgba(180,180,180,0.35)',
                top: '8px',
                left: '15px',
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
}
