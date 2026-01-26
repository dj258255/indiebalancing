'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, MousePointer, PenTool, Copy, Check, Download, RotateCcw, TrendingUp, Maximize2, X, History, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Tooltip } from '@/components/ui/Tooltip';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 토큰 배경색 제거한 커스텀 스타일 생성
function removeTokenBackgrounds(style: Record<string, React.CSSProperties>): Record<string, React.CSSProperties> {
  const newStyle: Record<string, React.CSSProperties> = {};
  for (const [key, value] of Object.entries(style)) {
    newStyle[key] = { ...value, background: 'transparent', backgroundColor: 'transparent' };
  }
  return newStyle;
}

import {
  Point,
  FitResult,
  CurveType,
  fitAllCurves,
  fitLinear,
  fitPolynomial,
  fitPower,
  fitExponential,
  fitLogarithmic,
  fitSigmoid,
  generateFormulaCode
} from '@/lib/curveFitting';

interface CurveFittingPanelProps {
  onClose?: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

type DrawMode = 'point' | 'draw';
type CodeLanguage = 'typescript' | 'csharp' | 'python';

const CURVE_COLORS: Record<CurveType, string> = {
  linear: '#3b82f6',
  quadratic: '#8b5cf6',
  cubic: '#ec4899',
  power: '#f59e0b',
  exponential: '#10b981',
  logarithmic: '#06b6d4',
  sigmoid: '#f43f5e'
};

const CURVE_NAMES: Record<CurveType, string> = {
  linear: 'Linear',
  quadratic: 'Quadratic',
  cubic: 'Cubic',
  power: 'Power',
  exponential: 'Exponential',
  logarithmic: 'Logarithmic',
  sigmoid: 'Sigmoid'
};

export default function CurveFittingPanel({ onClose, showHelp, setShowHelp }: CurveFittingPanelProps) {
  const t = useTranslations('curveFitting');
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>('point');
  const [fitResults, setFitResults] = useState<FitResult[]>([]);
  const [selectedFit, setSelectedFit] = useState<FitResult | null>(null);
  const [showAllCurves, setShowAllCurves] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('typescript');
  const [isDrawing, setIsDrawing] = useState(false);

  // Canvas coordinate system
  const [xRange, setXRange] = useState({ min: 0, max: 100 });
  const [yRange, setYRange] = useState({ min: 0, max: 100 });

  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreenCanvas, setFullscreenCanvas] = useState(false);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);

  // History state for undo/restore
  const [history, setHistory] = useState<{ points: Point[]; timestamp: Date }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHistory]);

  // Save to history when points change significantly
  const saveToHistory = useCallback((newPoints: Point[]) => {
    setHistory(prev => {
      // Prevent duplicate entries (same point count within 100ms)
      const lastEntry = prev[prev.length - 1];
      if (lastEntry &&
          lastEntry.points.length === newPoints.length &&
          Date.now() - lastEntry.timestamp.getTime() < 100) {
        return prev;
      }

      const newHistory = [...prev, { points: [...newPoints], timestamp: new Date() }];
      // Keep only last 50 entries
      if (newHistory.length > 50) {
        return newHistory.slice(-50);
      }
      return newHistory;
    });
    setHistoryIndex(-1); // Reset index when new action is taken
  }, []);

  // Restore from history
  const restoreFromHistory = (index: number) => {
    if (index >= 0 && index < history.length) {
      setPoints([...history[index].points]);
      setHistoryIndex(index);
      setShowHistory(false);
    }
  };

  // Delete from history
  const deleteFromHistory = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter((_, i) => i !== index));
    if (historyIndex === index) {
      setHistoryIndex(-1);
    } else if (historyIndex > index) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  // Convert canvas coords to data coords
  const canvasToData = useCallback((canvasX: number, canvasY: number, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    const padding = 40;
    const plotWidth = rect.width - padding * 2;
    const plotHeight = rect.height - padding * 2;

    const x = ((canvasX - padding) / plotWidth) * (xRange.max - xRange.min) + xRange.min;
    const y = ((plotHeight - (canvasY - padding)) / plotHeight) * (yRange.max - yRange.min) + yRange.min;

    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }, [xRange, yRange]);

  // Convert data coords to canvas coords
  const dataToCanvas = useCallback((point: Point, canvas: HTMLCanvasElement): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const padding = 40;
    const plotWidth = rect.width - padding * 2;
    const plotHeight = rect.height - padding * 2;

    const x = padding + ((point.x - xRange.min) / (xRange.max - xRange.min)) * plotWidth;
    const y = padding + plotHeight - ((point.y - yRange.min) / (yRange.max - yRange.min)) * plotHeight;

    return { x, y };
  }, [xRange, yRange]);

  // Theme-aware colors
  const isDark = theme === 'dark';
  const colors = {
    background: isDark ? '#1e1e2e' : '#ffffff',
    grid: isDark ? '#313244' : '#e5e7eb',
    axisLabel: isDark ? '#6c7086' : '#6b7280',
    point: isDark ? '#cdd6f4' : '#1f2937',
    pointStroke: isDark ? '#89b4fa' : '#3b82f6',
    selectedBg: isDark ? '#313244' : '#f3f4f6',
    selectedRing: isDark ? '#89b4fa' : '#3b82f6',
    cardBg: isDark ? '#181825' : '#f9fafb',
    bestFitBg: isDark ? '#a6e3a1' : '#22c55e',
    bestFitText: isDark ? '#1e1e2e' : '#ffffff',
    inputBg: isDark ? '#313244' : '#f3f4f6',
    buttonBg: isDark ? '#89b4fa' : '#3b82f6',
    buttonText: isDark ? '#1e1e2e' : '#ffffff',
    buttonHover: isDark ? '#74c7ec' : '#2563eb',
  };

  // Draw canvas - can draw on any canvas
  const drawOnCanvas = useCallback((canvas: HTMLCanvasElement) => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const padding = 40;
    const plotWidth = rect.width - padding * 2;
    const plotHeight = rect.height - padding * 2;

    // Clear
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i / 10) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + plotWidth, y);
      ctx.stroke();
    }

    // Axes labels
    ctx.fillStyle = colors.axisLabel;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';

    // X-axis labels
    for (let i = 0; i <= 10; i += 2) {
      const x = padding + (i / 10) * plotWidth;
      const value = xRange.min + (i / 10) * (xRange.max - xRange.min);
      ctx.fillText(value.toFixed(0), x, rect.height - 10);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i += 2) {
      const y = padding + (i / 10) * plotHeight;
      const value = yRange.max - (i / 10) * (yRange.max - yRange.min);
      ctx.fillText(value.toFixed(0), padding - 5, y + 4);
    }

    // Draw fitted curves
    const curvesToDraw = showAllCurves ? fitResults : (selectedFit ? [selectedFit] : []);

    for (const fit of curvesToDraw) {
      ctx.strokeStyle = CURVE_COLORS[fit.type];
      ctx.lineWidth = selectedFit?.type === fit.type ? 3 : 2;
      ctx.beginPath();

      let firstPoint = true;
      for (let px = 0; px <= plotWidth; px += 2) {
        const dataX = xRange.min + (px / plotWidth) * (xRange.max - xRange.min);
        try {
          const dataY = fit.predict(dataX);
          if (isFinite(dataY) && dataY >= yRange.min && dataY <= yRange.max) {
            const canvasY = padding + plotHeight - ((dataY - yRange.min) / (yRange.max - yRange.min)) * plotHeight;
            if (firstPoint) {
              ctx.moveTo(padding + px, canvasY);
              firstPoint = false;
            } else {
              ctx.lineTo(padding + px, canvasY);
            }
          } else {
            firstPoint = true;
          }
        } catch {
          firstPoint = true;
        }
      }
      ctx.stroke();
    }

    // Draw points
    for (const point of points) {
      const { x, y } = dataToCanvas(point, canvas);
      if (x >= padding && x <= rect.width - padding && y >= padding && y <= rect.height - padding) {
        ctx.fillStyle = colors.point;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.pointStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [points, fitResults, selectedFit, showAllCurves, xRange, yRange, dataToCanvas, colors]);

  // Wrapper to draw on main canvas
  const drawCanvas = useCallback(() => {
    if (canvasRef.current) {
      drawOnCanvas(canvasRef.current);
    }
  }, [drawOnCanvas]);

  // Draw on fullscreen canvas
  const drawFullscreenCanvas = useCallback(() => {
    if (fullscreenCanvasRef.current) {
      drawOnCanvas(fullscreenCanvasRef.current);
    }
  }, [drawOnCanvas]);

  // Auto-fit when points change
  useEffect(() => {
    if (points.length >= 2) {
      const results = fitAllCurves(points);
      setFitResults(results);
      if (results.length > 0 && !selectedFit) {
        setSelectedFit(results[0]);
      }
    } else {
      setFitResults([]);
      setSelectedFit(null);
    }
  }, [points]);

  // Redraw when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Draw fullscreen canvas when modal opens
  useEffect(() => {
    if (fullscreenCanvas) {
      // Use setTimeout to ensure canvas is mounted
      setTimeout(drawFullscreenCanvas, 50);
    }
  }, [fullscreenCanvas, drawFullscreenCanvas]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode !== 'point') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dataPoint = canvasToData(x, y, canvas);

    // Check bounds
    if (dataPoint.x >= xRange.min && dataPoint.x <= xRange.max &&
        dataPoint.y >= yRange.min && dataPoint.y <= yRange.max) {
      setPoints(prev => {
        const newPoints = [...prev, dataPoint];
        // Save to history for point mode (each click is a discrete action)
        saveToHistory(newPoints);
        return newPoints;
      });
    }
  };

  // Handle drawing mode
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode === 'draw') {
      setIsDrawing(true);
      handleCanvasClick(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || drawMode !== 'draw') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dataPoint = canvasToData(x, y, canvas);

    // Add point if it's far enough from the last point
    const lastPoint = points[points.length - 1];
    if (!lastPoint || Math.abs(dataPoint.x - lastPoint.x) > (xRange.max - xRange.min) / 50) {
      if (dataPoint.x >= xRange.min && dataPoint.x <= xRange.max &&
          dataPoint.y >= yRange.min && dataPoint.y <= yRange.max) {
        setPoints(prev => [...prev, dataPoint]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && points.length > 0) {
      // Save to history when drawing stroke ends
      saveToHistory(points);
    }
    setIsDrawing(false);
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    if (!selectedFit) return;
    const code = generateFormulaCode(selectedFit, codeLanguage);

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for environments without clipboard API (HTTP, iframe, etc.)
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Export points as CSV
  const handleExportCSV = () => {
    const csv = 'x,y\n' + points.map(p => `${p.x},${p.y}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'curve_points.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all points
  const handleClear = () => {
    setPoints([]);
    setFitResults([]);
    setSelectedFit(null);
  };

  // Undo last point
  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };


  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>

      {/* Toolbar */}
      <div className="p-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-tertiary)' }}>
          <button
            className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors"
            style={{
              background: drawMode === 'point' ? colors.buttonBg : 'transparent',
              color: drawMode === 'point' ? colors.buttonText : 'var(--text-secondary)'
            }}
            onClick={() => setDrawMode('point')}
          >
            <MousePointer size={14} />
            {t('pointMode')}
          </button>
          <button
            className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors"
            style={{
              background: drawMode === 'draw' ? colors.buttonBg : 'transparent',
              color: drawMode === 'draw' ? colors.buttonText : 'var(--text-secondary)'
            }}
            onClick={() => setDrawMode('draw')}
          >
            <PenTool size={14} />
            {t('drawMode')}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip content={t('undo')}>
            <button
              className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)]"
              onClick={handleUndo}
              disabled={points.length === 0}
              style={{ color: 'var(--text-secondary)' }}
            >
              <RotateCcw size={16} className={points.length === 0 ? 'opacity-50' : ''} />
            </button>
          </Tooltip>

          {/* History dropdown */}
          <div className="relative" ref={historyRef}>
            <Tooltip content={t('history')}>
              <button
                className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)] flex items-center gap-0.5"
                onClick={() => setShowHistory(!showHistory)}
                disabled={history.length === 0}
                style={{ color: 'var(--text-secondary)' }}
              >
                <History size={16} className={history.length === 0 ? 'opacity-50' : ''} />
                <ChevronDown size={12} className={history.length === 0 ? 'opacity-50' : ''} />
              </button>
            </Tooltip>

            {showHistory && history.length > 0 && (
              <div
                className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 min-w-[200px] overflow-hidden"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                <div className="max-h-[250px] overflow-y-auto py-1">
                  {history.slice().reverse().map((entry, idx) => {
                    const actualIndex = history.length - 1 - idx;
                    const isSelected = actualIndex === historyIndex;
                    return (
                      <div
                        key={actualIndex}
                        className="flex items-center hover:bg-[var(--bg-hover)] group"
                        style={{
                          background: isSelected ? 'var(--bg-tertiary)' : 'transparent'
                        }}
                      >
                        <button
                          className="flex-1 px-3 py-1.5 text-left text-xs flex items-center justify-between gap-2"
                          style={{
                            color: isSelected ? 'var(--primary-blue)' : 'var(--text-secondary)',
                          }}
                          onClick={() => restoreFromHistory(actualIndex)}
                        >
                          <span>{entry.points.length} {t('points')}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </button>
                        <button
                          className="p-1 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-opacity"
                          onClick={(e) => deleteFromHistory(actualIndex, e)}
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="border-t px-3 py-1.5"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  <button
                    className="w-full text-xs py-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                    style={{ color: 'var(--status-error)' }}
                    onClick={() => {
                      setHistory([]);
                      setHistoryIndex(-1);
                      setShowHistory(false);
                    }}
                  >
                    {t('clearHistory')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Tooltip content={t('clear')}>
            <button
              className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)]"
              onClick={handleClear}
              style={{ color: 'var(--text-secondary)' }}
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>
          <Tooltip content={t('exportCSV')}>
            <button
              className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)]"
              onClick={handleExportCSV}
              disabled={points.length === 0}
              style={{ color: 'var(--text-secondary)' }}
            >
              <Download size={16} className={points.length === 0 ? 'opacity-50' : ''} />
            </button>
          </Tooltip>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>{t('points')}: {points.length}</span>
        </div>
      </div>

      {/* Canvas and Results - Vertical Layout */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-y-auto min-h-0">
        {/* Help Content */}
        {showHelp && (
          <div className="mx-3 mt-3 p-3 rounded-lg animate-slideDown" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <p className="font-medium text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{t('helpCurvesTitle')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
              <div className="p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="font-medium" style={{ color: CURVE_COLORS.linear }}>{t('curves.linear')}</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('curves.linearDesc')}</p>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="font-medium" style={{ color: CURVE_COLORS.quadratic }}>{t('curves.quadratic')}</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('curves.quadraticDesc')}</p>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="font-medium" style={{ color: CURVE_COLORS.cubic }}>{t('curves.cubic')}</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('curves.cubicDesc')}</p>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="font-medium" style={{ color: CURVE_COLORS.power }}>{t('curves.power')}</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('curves.powerDesc')}</p>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="font-medium" style={{ color: CURVE_COLORS.exponential }}>{t('curves.exponential')}</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('curves.exponentialDesc')}</p>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="font-medium" style={{ color: CURVE_COLORS.logarithmic }}>{t('curves.logarithmic')}</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('curves.logarithmicDesc')}</p>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <span className="font-medium" style={{ color: CURVE_COLORS.sigmoid }}>{t('curves.sigmoid')}</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('curves.sigmoidDesc')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 p-3 relative min-h-[250px]">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair rounded-lg"
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          <button
            onClick={() => setFullscreenCanvas(true)}
            className="absolute top-5 right-5 p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
            title="전체화면"
          >
            <Maximize2 size={16} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Results Panel - Below Canvas */}
        <div className="border-t px-3 py-2" style={{ borderColor: 'var(--border-primary)' }}>
          {/* Fit Results - Horizontal scroll */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium shrink-0" style={{ color: 'var(--text-primary)' }}>{t('fittedCurves')}</h3>
            <label className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showAllCurves}
                onChange={(e) => setShowAllCurves(e.target.checked)}
                className="rounded"
              />
              {t('showAll')}
            </label>
          </div>

          {fitResults.length === 0 ? (
            <div className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
              {t('addPointsHint')}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {fitResults.map((fit, index) => (
                <button
                  key={fit.type}
                  className="shrink-0 p-2 rounded-lg text-left transition-colors min-w-[140px]"
                  style={{
                    background: selectedFit?.type === fit.type ? colors.selectedBg : colors.cardBg,
                    border: selectedFit?.type === fit.type ? `1px solid ${colors.selectedRing}` : '1px solid transparent'
                  }}
                  onClick={() => setSelectedFit(fit)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CURVE_COLORS[fit.type] }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{CURVE_NAMES[fit.type]}</span>
                    {index === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: colors.bestFitBg, color: colors.bestFitText }}>
                        {t('bestFit')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {fit.equation}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    R² = {(fit.rSquared * 100).toFixed(2)}%
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Code Export */}
          {selectedFit && (
            <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('formulaCode')}</h4>
                <div className="flex items-center gap-2">
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value as CodeLanguage)}
                    className="text-xs rounded px-2 py-1"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="csharp">C#</option>
                    <option value="python">Python</option>
                  </select>
                  <button
                    className="shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    style={{ background: colors.buttonBg, color: colors.buttonText }}
                    onClick={handleCopyCode}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode ? t('copied') : t('copyCode')}
                  </button>
                </div>
              </div>
              <SyntaxHighlighter
                language={codeLanguage === 'csharp' ? 'csharp' : codeLanguage}
                style={removeTokenBackgrounds(isDark ? oneDark : oneLight)}
                customStyle={{
                  margin: 0,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  border: '1px solid var(--border-primary)',
                }}
                wrapLongLines
              >
                {generateFormulaCode(selectedFit, codeLanguage)}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>

      {/* Axis Range Controls */}
      <div className="p-3 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-tertiary)' }}>X:</span>
          <input
            type="text"
            inputMode="decimal"
            value={xRange.min}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) setXRange(prev => ({ ...prev, min: val }));
            }}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          <input
            type="text"
            inputMode="decimal"
            value={xRange.max}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) setXRange(prev => ({ ...prev, max: val }));
            }}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-tertiary)' }}>Y:</span>
          <input
            type="text"
            inputMode="decimal"
            value={yRange.min}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) setYRange(prev => ({ ...prev, min: val }));
            }}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          <input
            type="text"
            inputMode="decimal"
            value={yRange.max}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) setYRange(prev => ({ ...prev, max: val }));
            }}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
        </div>
      </div>

      {/* Fullscreen Canvas Modal */}
      {fullscreenCanvas && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setFullscreenCanvas(false)}
        >
          <div
            className="w-full h-full max-w-6xl max-h-[90vh] rounded-xl p-4 flex flex-col"
            style={{ background: 'var(--bg-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Toolbar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {/* Mode Toggle */}
                <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg-tertiary)' }}>
                  <button
                    className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors"
                    style={{
                      background: drawMode === 'point' ? colors.buttonBg : 'transparent',
                      color: drawMode === 'point' ? colors.buttonText : 'var(--text-secondary)'
                    }}
                    onClick={() => setDrawMode('point')}
                  >
                    <MousePointer size={14} />
                    {t('pointMode')}
                  </button>
                  <button
                    className="px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors"
                    style={{
                      background: drawMode === 'draw' ? colors.buttonBg : 'transparent',
                      color: drawMode === 'draw' ? colors.buttonText : 'var(--text-secondary)'
                    }}
                    onClick={() => setDrawMode('draw')}
                  >
                    <PenTool size={14} />
                    {t('drawMode')}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)]"
                    onClick={handleUndo}
                    title={t('undo')}
                    disabled={points.length === 0}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <RotateCcw size={16} className={points.length === 0 ? 'opacity-50' : ''} />
                  </button>
                  <button
                    className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)]"
                    onClick={handleClear}
                    title={t('clear')}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    className="p-2 rounded transition-colors hover:bg-[var(--bg-hover)]"
                    onClick={handleExportCSV}
                    title={t('exportCSV')}
                    disabled={points.length === 0}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Download size={16} className={points.length === 0 ? 'opacity-50' : ''} />
                  </button>
                </div>

                <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
                  {t('points')}: {points.length}
                </span>
              </div>

              <button
                onClick={() => setFullscreenCanvas(false)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 min-h-0">
              <canvas
                ref={fullscreenCanvasRef}
                className="w-full h-full rounded-lg cursor-crosshair"
                style={{ background: colors.background }}
                onClick={(e) => {
                  if (drawMode === 'point' && fullscreenCanvasRef.current) {
                    const rect = fullscreenCanvasRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const point = canvasToData(x, y, fullscreenCanvasRef.current);
                    if (point.x >= xRange.min && point.x <= xRange.max && point.y >= yRange.min && point.y <= yRange.max) {
                      setPoints(prev => [...prev, point]);
                    }
                  }
                }}
                onMouseDown={(e) => {
                  if (drawMode === 'draw') {
                    setIsDrawing(true);
                  }
                }}
                onMouseMove={(e) => {
                  if (isDrawing && drawMode === 'draw' && fullscreenCanvasRef.current) {
                    const rect = fullscreenCanvasRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const point = canvasToData(x, y, fullscreenCanvasRef.current);
                    if (point.x >= xRange.min && point.x <= xRange.max && point.y >= yRange.min && point.y <= yRange.max) {
                      setPoints(prev => {
                        if (prev.length === 0) return [point];
                        const last = prev[prev.length - 1];
                        const dist = Math.sqrt(Math.pow(point.x - last.x, 2) + Math.pow(point.y - last.y, 2));
                        if (dist > 2) {
                          return [...prev, point];
                        }
                        return prev;
                      });
                    }
                  }
                }}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
              />
            </div>

            {/* Axis Range Controls */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-tertiary)' }}>X:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={xRange.min}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setXRange(prev => ({ ...prev, min: val }));
                  }}
                  className="w-16 px-2 py-1 rounded text-center"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                />
                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={xRange.max}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setXRange(prev => ({ ...prev, max: val }));
                  }}
                  className="w-16 px-2 py-1 rounded text-center"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-tertiary)' }}>Y:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={yRange.min}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setYRange(prev => ({ ...prev, min: val }));
                  }}
                  className="w-16 px-2 py-1 rounded text-center"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                />
                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={yRange.max}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setYRange(prev => ({ ...prev, max: val }));
                  }}
                  className="w-16 px-2 py-1 rounded text-center"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
