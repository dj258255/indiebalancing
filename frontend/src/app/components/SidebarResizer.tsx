'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToolLayoutStore } from '@/stores/toolLayoutStore';

export default function SidebarResizer() {
  const { sidebarWidth, setSidebarWidth } = useToolLayoutStore();
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      setSidebarWidth(e.clientX);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <div
      className="hidden md:flex w-1 hover:w-1.5 cursor-col-resize items-center justify-center group transition-all shrink-0"
      style={{
        background: isResizing ? 'var(--accent)' : 'transparent',
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="w-0.5 h-8 rounded-full transition-all group-hover:h-16"
        style={{
          background: isResizing ? 'white' : 'var(--border-primary)',
        }}
      />
    </div>
  );
}
