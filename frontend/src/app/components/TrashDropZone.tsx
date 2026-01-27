'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface TrashDropZoneProps {
  onClosePanel: (panelId: string) => void;
}

export default function TrashDropZone({ onClosePanel }: TrashDropZoneProps) {
  const t = useTranslations();
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const currentPanelIdRef = useRef<string | null>(null);
  const trashZoneId = 'trash-drop-zone';

  // 쓰레기통 호버 감지
  const checkHover = useCallback((x: number, y: number) => {
    const trashZone = document.getElementById(trashZoneId);
    if (!trashZone) return false;

    const rect = trashZone.getBoundingClientRect();
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }, []);

  useEffect(() => {
    const handlePanelDragStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ panelId: string }>;
      currentPanelIdRef.current = customEvent.detail?.panelId || null;
      setIsVisible(true);
    };

    const handlePanelDragEnd = () => {
      // 호버 중이면 패널 닫기 호출 (마우스 업 후)
      setIsVisible(false);
      setIsHovered(false);
      // panel-drag-end 후에도 잠시 유지 (mouseup 이벤트 처리를 위해)
      setTimeout(() => {
        currentPanelIdRef.current = null;
      }, 100);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isVisible) {
        const over = checkHover(e.clientX, e.clientY);
        setIsHovered(over);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isVisible && checkHover(e.clientX, e.clientY) && currentPanelIdRef.current) {
        onClosePanel(currentPanelIdRef.current);
      }
      setIsVisible(false);
      setIsHovered(false);
    };

    window.addEventListener('panel-drag-start', handlePanelDragStart);
    window.addEventListener('panel-drag-end', handlePanelDragEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('panel-drag-start', handlePanelDragStart);
      window.removeEventListener('panel-drag-end', handlePanelDragEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isVisible, checkHover, onClosePanel]);

  if (!isVisible) return null;

  return (
    <div
      id={trashZoneId}
      className={cn(
        "fixed bottom-4 right-4 z-[200] flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-200 hidden md:flex",
        isHovered
          ? "scale-110 bg-red-500 shadow-xl shadow-red-500/30"
          : "scale-100 bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-lg"
      )}
      style={{
        width: 80,
        height: 80,
      }}
    >
      <Trash2
        className={cn(
          "w-8 h-8 transition-colors",
          isHovered ? "text-white" : "text-red-500"
        )}
      />
      <span
        className={cn(
          "text-xs font-medium transition-colors",
          isHovered ? "text-white" : "text-[var(--text-tertiary)]"
        )}
      >
        {t('common.close')}
      </span>
    </div>
  );
}
