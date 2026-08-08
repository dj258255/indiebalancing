import { useState, useCallback, useEffect, useRef } from 'react';
import { useToolLayoutStore } from '@/stores/toolLayoutStore';

export function useToolsSectionResize() {
  const { toolsSectionHeight, setToolsSectionHeight } = useToolLayoutStore();

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = toolsSectionHeight;
  }, [toolsSectionHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.max(60, Math.min(600, resizeStartHeight.current + deltaY));
      setToolsSectionHeight(newHeight);
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
  }, [isResizing, setToolsSectionHeight]);

  return {
    isResizing,
    handleResizeStart,
  };
}
