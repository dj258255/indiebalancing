'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, MousePointer, PenTool, Copy, Check, Download, RotateCcw, TrendingUp } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
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

  // Resizable panel
  const [resultsPanelWidth, setResultsPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
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
      setPoints(prev => [...prev, dataPoint]);
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
    setIsDrawing(false);
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!selectedFit) return;
    const code = generateFormulaCode(selectedFit, codeLanguage);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;

    // Clamp between 200px and 50% of container width
    const minWidth = 200;
    const maxWidth = containerRect.width * 0.5;
    setResultsPanelWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      {/* Help Content */}
      {showHelp && (
        <div className="mx-3 mt-3 mb-2 p-3 rounded-lg animate-slideDown" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#6366f120' }}>
                <TrendingUp className="w-3 h-3" style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('helpDesc')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #3b82f6' }}>
                <span className="font-medium text-sm" style={{ color: '#3b82f6' }}>{t('helpStep1Title')}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpStep1')}</p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #22c55e' }}>
                <span className="font-medium text-sm" style={{ color: '#22c55e' }}>{t('helpStep2Title')}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpStep2')}</p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #8b5cf6' }}>
                <span className="font-medium text-sm" style={{ color: '#8b5cf6' }}>{t('helpStep3Title')}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpStep3')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

        <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>{t('points')}: {points.length}</span>
        </div>
      </div>

      {/* Canvas and Results */}
      <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Canvas */}
        <div className="flex-1 p-3 min-h-[300px] shrink-0 lg:shrink lg:min-h-0">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair rounded-lg"
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Resize Handle - desktop only */}
        <div
          className="hidden lg:flex items-center justify-center cursor-col-resize hover:bg-[var(--bg-hover)] transition-colors group"
          style={{ width: '6px' }}
          onMouseDown={handleResizeStart}
        >
          <div
            className="w-1 h-12 rounded-full transition-colors"
            style={{
              background: isResizing ? 'var(--primary-blue)' : 'var(--border-primary)',
            }}
          />
        </div>

        {/* Results Panel */}
        <div
          className="w-full lg:w-auto border-t lg:border-t-0 flex flex-col overflow-hidden shrink-0"
          style={{
            borderColor: 'var(--border-primary)',
          }}
        >
          <div
            className="flex flex-col overflow-hidden h-full"
            style={{ width: resultsPanelWidth, minWidth: '200px' }}>
          {/* Fit Results */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('fittedCurves')}</h3>
              <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
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
              <div className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                {t('addPointsHint')}
              </div>
            ) : (
              <div className="space-y-2">
                {fitResults.map((fit, index) => (
                  <button
                    key={fit.type}
                    className="w-full p-2 rounded-lg text-left transition-colors"
                    style={{
                      background: selectedFit?.type === fit.type ? colors.selectedBg : colors.cardBg,
                      border: selectedFit?.type === fit.type ? `1px solid ${colors.selectedRing}` : '1px solid transparent'
                    }}
                    onClick={() => setSelectedFit(fit)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CURVE_COLORS[fit.type] }}
                      />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{CURVE_NAMES[fit.type]}</span>
                      {index === 0 && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: colors.bestFitBg, color: colors.bestFitText }}>
                          {t('bestFit')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono break-all" style={{ color: 'var(--text-tertiary)' }}>
                      {fit.equation}
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      R² = {(fit.rSquared * 100).toFixed(2)}%
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Code Export */}
          {selectedFit && (
            <div className="border-t p-3" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('formulaCode')}</h3>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value as CodeLanguage)}
                  className="text-xs rounded px-2 py-1"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                >
                  <option value="typescript">TypeScript</option>
                  <option value="csharp">C#</option>
                  <option value="python">Python</option>
                </select>
              </div>
              <pre className="text-[10px] p-2 rounded-lg overflow-x-auto font-mono" style={{ background: colors.cardBg, color: 'var(--text-secondary)' }}>
                {generateFormulaCode(selectedFit, codeLanguage)}
              </pre>
              <button
                className="w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                style={{ background: colors.buttonBg, color: colors.buttonText }}
                onClick={handleCopyCode}
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                {copiedCode ? t('copied') : t('copyCode')}
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Axis Range Controls */}
      <div className="p-3 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-tertiary)' }}>X:</span>
          <input
            type="number"
            value={xRange.min}
            onChange={(e) => setXRange(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          <input
            type="number"
            value={xRange.max}
            onChange={(e) => setXRange(prev => ({ ...prev, max: parseFloat(e.target.value) || 100 }))}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-tertiary)' }}>Y:</span>
          <input
            type="number"
            value={yRange.min}
            onChange={(e) => setYRange(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          <input
            type="number"
            value={yRange.max}
            onChange={(e) => setYRange(prev => ({ ...prev, max: parseFloat(e.target.value) || 100 }))}
            className="w-16 px-2 py-1 rounded text-center"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          />
        </div>
      </div>
    </div>
  );
}
