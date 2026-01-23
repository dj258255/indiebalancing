'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FunctionSquare, Shield, TrendingUp, Swords, Calculator, PieChart, BarChart3, GitCompare, AlertTriangle, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useToolLayoutStore, AllToolId, PanelToolId } from '@/stores/toolLayoutStore';
import { cn } from '@/lib/utils';

// 모바일 감지 훅
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

interface BottomToolbarProps {
  show: {
    formulaHelper: boolean;
    balanceValidator: boolean;
    difficultyCurve: boolean;
    simulation: boolean;
  };
  setShow: {
    formulaHelper: (value: boolean) => void;
    balanceValidator: (value: boolean) => void;
    difficultyCurve: (value: boolean) => void;
    simulation: (value: boolean) => void;
  };
  onShowCalculator?: () => void;
  onShowComparison?: () => void;
  onShowChart?: () => void;
  onShowPresetComparison?: () => void;
  onShowImbalanceDetector?: () => void;
  onShowGoalSolver?: () => void;
  onShowBalanceAnalysis?: () => void;
  isModalOpen: boolean;
}

const TOOL_CONFIG: Record<AllToolId, { icon: typeof FunctionSquare; color: string; labelKey: string }> = {
  formulaHelper: { icon: FunctionSquare, color: '#3b82f6', labelKey: 'bottomTabs.formulaHelper' },
  balanceValidator: { icon: Shield, color: '#22c55e', labelKey: 'bottomTabs.balanceValidator' },
  difficultyCurve: { icon: TrendingUp, color: '#8b5cf6', labelKey: 'bottomTabs.difficultyCurve' },
  simulation: { icon: Swords, color: '#ef4444', labelKey: 'bottomTabs.simulation' },
  calculator: { icon: Calculator, color: '#8b5cf6', labelKey: 'sidebar.calculator' },
  comparison: { icon: PieChart, color: '#3b82f6', labelKey: 'sidebar.comparison' },
  chart: { icon: BarChart3, color: '#22c55e', labelKey: 'sidebar.chart' },
  presetComparison: { icon: GitCompare, color: '#f97316', labelKey: 'sidebar.presetComparison' },
  imbalanceDetector: { icon: AlertTriangle, color: '#eab308', labelKey: 'sidebar.imbalanceDetector' },
  goalSolver: { icon: Target, color: '#14b8a6', labelKey: 'sidebar.goalSolver' },
  balanceAnalysis: { icon: TrendingUp, color: '#ec4899', labelKey: 'sidebar.balanceAnalysis' },
};

const isPanelTool = (toolId: AllToolId): toolId is PanelToolId => {
  return ['formulaHelper', 'balanceValidator', 'difficultyCurve', 'simulation'].includes(toolId);
};

export default function BottomToolbar({
  show,
  setShow,
  onShowCalculator,
  onShowComparison,
  onShowChart,
  onShowPresetComparison,
  onShowImbalanceDetector,
  onShowGoalSolver,
  onShowBalanceAnalysis,
  isModalOpen
}: BottomToolbarProps) {
  const t = useTranslations();
  const {
    toolLocations,
    bottomToolPositions,
    updateBottomToolPosition,
    moveToolToLocation,
    getBottomTools,
    getToolZIndex,
    sidebarWidth
  } = useToolLayoutStore();

  const [draggingTool, setDraggingTool] = useState<AllToolId | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isOverToolsSection, setIsOverToolsSection] = useState(false);
  const [toolsSectionRect, setToolsSectionRect] = useState<DOMRect | null>(null);
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const hasMoved = useRef(false);
  const pendingTool = useRef<AllToolId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const bottomTools = getBottomTools();

  const sidebarToolHandlers: Record<string, (() => void) | undefined> = {
    calculator: onShowCalculator,
    comparison: onShowComparison,
    chart: onShowChart,
    presetComparison: onShowPresetComparison,
    imbalanceDetector: onShowImbalanceDetector,
    goalSolver: onShowGoalSolver,
    balanceAnalysis: onShowBalanceAnalysis,
  };

  const handleToolClick = useCallback((toolId: AllToolId) => {
    if (isModalOpen) return;

    if (isPanelTool(toolId)) {
      setShow[toolId](!show[toolId]);
    } else {
      const handler = sidebarToolHandlers[toolId];
      if (handler) handler();
    }
  }, [isModalOpen, show, setShow, sidebarToolHandlers]);

  const handleMouseDown = (e: React.MouseEvent, toolId: AllToolId) => {
    if (e.button !== 0) return;

    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    hasMoved.current = false;
    pendingTool.current = toolId;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!pendingTool.current) return;

      const deltaX = Math.abs(e.clientX - dragStartX.current);
      const deltaY = Math.abs(e.clientY - dragStartY.current);

      if (!hasMoved.current && (deltaX > 5 || deltaY > 5)) {
        hasMoved.current = true;
        setDraggingTool(pendingTool.current);
      }

      if (hasMoved.current && pendingTool.current) {
        setDragPosition({ x: e.clientX, y: e.clientY });

        // 도구 섹션 영역 체크
        const toolsSection = document.getElementById('sidebar-tools-section');
        if (toolsSection) {
          const rect = toolsSection.getBoundingClientRect();
          setToolsSectionRect(rect);
          const isInToolsSection =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;
          setIsOverToolsSection(isInToolsSection);
        } else {
          setIsOverToolsSection(false);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const currentTool = pendingTool.current;

      if (currentTool && !hasMoved.current) {
        handleToolClick(currentTool);
      } else if (currentTool && hasMoved.current) {
        // 도구 섹션 영역에서 놓으면 사이드바로 이동
        const toolsSection = document.getElementById('sidebar-tools-section');
        if (toolsSection) {
          const rect = toolsSection.getBoundingClientRect();
          const isInToolsSection =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;
          if (isInToolsSection) {
            moveToolToLocation(currentTool, 'sidebar');
          } else {
            // 하단 영역에서 좌우로 이동 - X 좌표 업데이트 (버튼 중앙 기준)
            const buttonHalfWidth = 50; // 버튼 대략적인 너비의 절반
            updateBottomToolPosition(currentTool, e.clientX - buttonHalfWidth);
          }
        } else {
          // 도구 섹션을 찾을 수 없으면 좌우 이동만 처리 (버튼 중앙 기준)
          const buttonHalfWidth = 50;
          updateBottomToolPosition(currentTool, e.clientX - buttonHalfWidth);
        }
      }

      setDraggingTool(null);
      setDragPosition(null);
      setIsOverToolsSection(false);
      setToolsSectionRect(null);
      pendingTool.current = null;
      hasMoved.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleToolClick, moveToolToLocation, updateBottomToolPosition]);

  // 유효한 도구 ID 목록
  const validToolIds = Object.keys(TOOL_CONFIG);

  // 전역 드래그 이벤트 감지 (document 레벨)
  useEffect(() => {
    const handleGlobalDragStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('application/x-tool-id')) {
        setIsGlobalDragging(true);
      }
    };

    const handleGlobalDragEnd = () => {
      setIsGlobalDragging(false);
      setIsDraggingFromSidebar(false);
    };

    document.addEventListener('dragstart', handleGlobalDragStart);
    document.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleGlobalDragStart);
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    // 드래그 중인 데이터가 도구인지 확인 (커스텀 MIME 타입으로 구분)
    const isToolDrag = e.dataTransfer.types.includes('application/x-tool-id');
    if (!isToolDrag) return;

    e.preventDefault();
    setIsDraggingFromSidebar(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 자식 요소로 이동할 때는 무시
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFromSidebar(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFromSidebar(false);
    const toolId = e.dataTransfer.getData('text/plain') as AllToolId;
    // 유효한 도구 ID인지 확인
    if (toolId && validToolIds.includes(toolId) && toolLocations[toolId] === 'sidebar') {
      const x = e.clientX - 50; // 버튼 중앙 기준
      moveToolToLocation(toolId, 'bottom', x);
    }
  };

  const isMobile = useIsMobile();
  // 모바일에서는 sidebarWidth가 아닌 0 사용 (사이드바가 숨겨지므로)
  const responsiveLeftOffset = isMobile ? 0 : sidebarWidth;

  // 하단 도구가 없으면 드롭 영역만 표시 (항상 드롭 가능하도록 영역은 유지)
  if (bottomTools.length === 0) {
    return (
      <div
        ref={containerRef}
        className="fixed bottom-0 right-0 z-30 hidden md:flex items-end justify-center pointer-events-auto transition-all"
        style={{
          left: `${responsiveLeftOffset}px`,
          height: isDraggingFromSidebar ? '120px' : '80px', // 감지 영역 확대
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingFromSidebar && (
          <div
            className="w-full h-16 flex items-center justify-center"
            style={{
              background: 'rgba(var(--accent-rgb), 0.1)',
              borderTop: '2px dashed var(--accent)',
            }}
          >
            <div
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--accent)',
                color: 'white',
              }}
            >
              {t('bottomTabs.dropToMove')}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* 도구 섹션 드롭 영역 표시 */}
      {draggingTool && isOverToolsSection && toolsSectionRect && (
        <div
          className="fixed z-50 pointer-events-none flex items-center justify-center rounded-lg"
          style={{
            left: toolsSectionRect.left,
            top: toolsSectionRect.top,
            width: toolsSectionRect.width,
            height: toolsSectionRect.height,
            background: 'rgba(var(--accent-rgb), 0.15)',
            border: '2px dashed var(--accent)'
          }}
        >
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--accent)',
              color: 'white'
            }}
          >
            {t('bottomTabs.dropToMove')}
          </div>
        </div>
      )}

      {/* 드래그 중인 버튼 미리보기 */}
      {draggingTool && dragPosition && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragPosition.x - 50,
            top: dragPosition.y - 20,
            opacity: 0.8,
            transform: 'scale(1.05)',
          }}
        >
          {(() => {
            const config = TOOL_CONFIG[draggingTool];
            const Icon = config.icon;
            return (
              <div
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl shadow-lg"
                style={{
                  background: 'var(--bg-primary)',
                  border: '2px solid var(--accent)',
                  color: config.color,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span>{t(config.labelKey)}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* 사이드바에서 드래그 시 하단 드롭 영역 표시 */}
      {isDraggingFromSidebar && (
        <div
          className="fixed bottom-0 right-0 z-[100] h-20 pointer-events-none flex items-center justify-center hidden md:flex"
          style={{
            left: `${responsiveLeftOffset}px`,
            background: 'var(--bg-primary)',
            borderTop: '2px dashed var(--accent)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div
            className="px-6 py-3 rounded-xl text-sm font-semibold shadow-lg"
            style={{
              background: 'var(--accent)',
              color: 'white'
            }}
          >
            {t('bottomTabs.dropToMove')}
          </div>
        </div>
      )}

      {/* 하단 드롭 영역 (사이드바에서 드래그할 때만 활성화) */}
      <div
        ref={containerRef}
        className="fixed bottom-0 left-0 right-0 z-20 h-24"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ pointerEvents: isGlobalDragging ? 'auto' : 'none' }}
      />

      {/* 하단 버튼들 - 위치가 지정되지 않은 것은 가운데 정렬, 지정된 것은 절대 위치 */}
      {(() => {
        const centeredTools = bottomTools.filter(id => !bottomToolPositions[id]);
        const positionedTools = bottomTools.filter(id => bottomToolPositions[id]);

        return (
          <>
            {/* 가운데 정렬 버튼들 (위치 미지정) */}
            {centeredTools.length > 0 && (
              <div className="fixed bottom-0 left-0 md:left-auto right-0 z-[45] flex justify-center items-end gap-1 pointer-events-none" style={{ left: isMobile ? 0 : `${responsiveLeftOffset}px` }}>
                {centeredTools.map((toolId) => {
                  const config = TOOL_CONFIG[toolId];
                  if (!config) return null;

                  const Icon = config.icon;
                  const isActive = isPanelTool(toolId) ? show[toolId] : false;
                  const isDraggingThis = draggingTool === toolId;

                  return (
                    <div
                      key={toolId}
                      className={cn(
                        'pointer-events-auto cursor-grab active:cursor-grabbing transition-all'
                      )}
                      style={{ opacity: isDraggingThis ? 0.5 : 1 }}
                      onMouseDown={(e) => handleMouseDown(e, toolId)}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all rounded-t-xl whitespace-nowrap select-none',
                          isActive
                            ? 'liquid-glass-active'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-t border-l border-r border-[var(--border-primary)]',
                          isModalOpen && 'opacity-50'
                        )}
                        style={{
                          color: isActive ? config.color : undefined,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                        <span className="hidden sm:inline">{t(config.labelKey)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 절대 위치 버튼들 (위치 지정됨) - 데스크탑에서만 표시 */}
            {!isMobile && positionedTools.map((toolId) => {
              const config = TOOL_CONFIG[toolId];
              if (!config) return null;

              const Icon = config.icon;
              const isActive = isPanelTool(toolId) ? show[toolId] : false;
              const position = bottomToolPositions[toolId];
              const isDraggingThis = draggingTool === toolId;
              const zIndex = getToolZIndex(toolId);

              return (
                <div
                  key={toolId}
                  className={cn(
                    'fixed bottom-0 cursor-grab active:cursor-grabbing transition-all hidden md:block'
                  )}
                  style={{
                    left: `${position.x}px`,
                    zIndex: 45 + zIndex,
                    opacity: isDraggingThis ? 0.5 : 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, toolId)}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all rounded-t-xl whitespace-nowrap select-none',
                      isActive
                        ? 'liquid-glass-active'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-t border-l border-r border-[var(--border-primary)]',
                      isModalOpen && 'opacity-50'
                    )}
                    style={{
                      color: isActive ? config.color : undefined,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                    <span className="hidden sm:inline">{t(config.labelKey)}</span>
                  </div>
                </div>
              );
            })}

            {/* 모바일에서는 위치 지정된 버튼들도 가운데 정렬로 표시 */}
            {isMobile && positionedTools.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 z-[45] flex justify-center items-end gap-1 pointer-events-none md:hidden">
                {positionedTools.map((toolId) => {
                  const config = TOOL_CONFIG[toolId];
                  if (!config) return null;

                  const Icon = config.icon;
                  const isActive = isPanelTool(toolId) ? show[toolId] : false;

                  return (
                    <div
                      key={toolId}
                      className="pointer-events-auto"
                      onClick={() => handleToolClick(toolId)}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-1 px-2 py-2 text-xs font-semibold transition-all rounded-t-xl whitespace-nowrap select-none',
                          isActive
                            ? 'liquid-glass-active'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-t border-l border-r border-[var(--border-primary)]',
                          isModalOpen && 'opacity-50'
                        )}
                        style={{
                          color: isActive ? config.color : undefined,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
    </>
  );
}
