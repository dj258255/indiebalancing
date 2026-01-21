'use client';

import { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  BarChart,
  Scale,
  Mountain,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { detectImbalances, getSeverityColor, type ImbalanceIssue, type Severity, type DetectionConfig } from '@/lib/imbalanceDetector';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface ImbalanceDetectorPanelProps {
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

// 타입별 아이콘 매핑
const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  outlier: AlertTriangle,
  power_creep: TrendingUp,
  variance: BarChart,
  cliff: Mountain,
  efficiency: Scale,
};

export default function ImbalanceDetectorPanel({ onClose, onDragStart }: ImbalanceDetectorPanelProps) {
  // ESC 키로 패널 닫기
  useEscapeKey(onClose);

  const { projects, currentProjectId, currentSheetId } = useProjectStore();

  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  // 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [issues, setIssues] = useState<ImbalanceIssue[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [showHelp, setShowHelp] = useState(false);
  const [helpHeight, setHelpHeight] = useState(120);

  // 설정
  const [config, setConfig] = useState<DetectionConfig>({
    outlierThreshold: 2.5,
    powerCreepThreshold: 3,
    varianceThreshold: 0.3,
    cliffThreshold: 2,
  });

  // 분석 실행
  const runAnalysis = () => {
    if (!currentSheet) return;

    setIsAnalyzing(true);
    setHasAnalyzed(false);

    // 비동기처럼 보이게 (UI 업데이트 허용)
    setTimeout(() => {
      const detected = detectImbalances(currentSheet, config);
      setIssues(detected);
      setHasAnalyzed(true);
      setIsAnalyzing(false);
    }, 100);
  };

  // 필터링된 이슈
  const filteredIssues = useMemo(() => {
    if (filterSeverity === 'all') return issues;
    return issues.filter(i => i.severity === filterSeverity);
  }, [issues, filterSeverity]);

  // 심각도별 카운트
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    for (const issue of issues) {
      counts[issue.severity]++;
    }
    return counts;
  }, [issues]);

  // 이슈 확장/축소 토글
  const toggleIssue = (issueId: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 relative z-20 cursor-grab active:cursor-grabbing"
        style={{ background: '#eab30815', borderBottom: '1px solid #eab30840' }}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest('button') && onDragStart) {
            onDragStart(e);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#eab308' }}>
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold" style={{ color: '#eab308' }}>불균형 감지</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1 rounded-lg transition-colors ${showHelp ? 'bg-[#eab308]/20' : 'hover:bg-[var(--bg-hover)]'}`}
            style={{ border: showHelp ? '1px solid #eab308' : '1px solid var(--border-secondary)' }}
          >
            <HelpCircle className="w-4 h-4" style={{ color: showHelp ? '#eab308' : 'var(--text-tertiary)' }} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 도움말 패널 */}
      {showHelp && (
        <div className="shrink-0 animate-slideDown flex flex-col" style={{ height: `${helpHeight + 6}px`, minHeight: '66px', maxHeight: '306px', borderBottom: '1px solid var(--border-primary)' }}>
          <div
            className="flex-1 px-4 py-3 text-sm overflow-y-auto"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>불균형 감지 (자동 경고)</div>
            <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>시트 데이터를 스캔해서 문제가 될 수 있는 패턴을 <strong>자동으로 찾아</strong> 경고해줍니다.</p>
            <div className="space-y-1 mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div>- 이상치: 다른 값과 동떨어진 값</div>
              <div>- 파워크립: 후반 급상승</div>
              <div>- 절벽: 연속 값의 급격한 변화</div>
              <div>- 분산: 같은 그룹 내 큰 편차</div>
            </div>
            <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
              <strong>vs 밸런스 분석:</strong> 분석은 심층 패턴 분석, 감지는 즉각적 문제 발견
            </div>
          </div>
          {/* 리사이저 */}
          <div
            className="h-1.5 shrink-0 cursor-ns-resize hover:bg-[var(--accent)] transition-colors"
            style={{ background: 'var(--border-secondary)' }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startH = helpHeight;
              const onMouseMove = (moveEvent: MouseEvent) => {
                const newHeight = Math.max(60, Math.min(300, startH + moveEvent.clientY - startY));
                setHelpHeight(newHeight);
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />
        </div>
      )}

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 설정 패널 */}
        {showSettings && (
          <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>감지 설정</div>
              <div className="group relative">
                <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-tertiary)' }} />
                <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-64 p-2 rounded-lg text-xs shadow-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                  값이 낮을수록 민감하게 감지합니다. 너무 낮으면 오탐이 많고, 너무 높으면 문제를 놓칠 수 있습니다.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 이상치 임계값 */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    이상치 임계값 (Z-score)
                  </label>
                  <div className="group relative">
                    <HelpCircle className="w-3 h-3 cursor-help" style={{ color: 'var(--text-tertiary)' }} />
                    <div className="absolute left-0 top-4 z-50 hidden group-hover:block w-56 p-2 rounded-lg text-xs shadow-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                      <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>이상치 감지</div>
                      평균에서 벗어난 정도를 측정합니다.
                      <div className="mt-1.5 space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        <div>2.0: 민감 (상위 2.3% 감지)</div>
                        <div>2.5: 보통 (상위 0.6% 감지) - 권장</div>
                        <div>3.0: 둔감 (상위 0.1% 감지)</div>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={config.outlierThreshold}
                  onChange={(e) => setConfig({ ...config, outlierThreshold: parseFloat(e.target.value) || 2.5 })}
                  step={0.5}
                  min={1}
                  max={5}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* 파워크립 임계값 */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    파워크립 임계값 (배율)
                  </label>
                  <div className="group relative">
                    <HelpCircle className="w-3 h-3 cursor-help" style={{ color: 'var(--text-tertiary)' }} />
                    <div className="absolute right-0 top-4 z-50 hidden group-hover:block w-56 p-2 rounded-lg text-xs shadow-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                      <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>파워크립 감지</div>
                      후반 유닛이 초반 대비 몇 배 강한지 확인합니다.
                      <div className="mt-1.5 space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        <div>2.0: 엄격 (2배 이상 경고)</div>
                        <div>3.0: 보통 (3배 이상 경고) - 권장</div>
                        <div>5.0: 관대 (5배 이상만 경고)</div>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={config.powerCreepThreshold}
                  onChange={(e) => setConfig({ ...config, powerCreepThreshold: parseFloat(e.target.value) || 3 })}
                  step={0.5}
                  min={1.5}
                  max={10}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* 분산 임계값 */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    분산 임계값 (CV)
                  </label>
                  <div className="group relative">
                    <HelpCircle className="w-3 h-3 cursor-help" style={{ color: 'var(--text-tertiary)' }} />
                    <div className="absolute left-0 top-4 z-50 hidden group-hover:block w-56 p-2 rounded-lg text-xs shadow-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                      <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>분산 감지</div>
                      같은 레벨/등급 유닛들의 스탯 편차를 측정합니다. (CV = 표준편차/평균)
                      <div className="mt-1.5 space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        <div>0.2: 엄격 (20% 편차 경고)</div>
                        <div>0.3: 보통 (30% 편차 경고) - 권장</div>
                        <div>0.5: 관대 (50% 편차만 경고)</div>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={config.varianceThreshold}
                  onChange={(e) => setConfig({ ...config, varianceThreshold: parseFloat(e.target.value) || 0.3 })}
                  step={0.1}
                  min={0.1}
                  max={1}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* 절벽 임계값 */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    절벽 임계값 (배율)
                  </label>
                  <div className="group relative">
                    <HelpCircle className="w-3 h-3 cursor-help" style={{ color: 'var(--text-tertiary)' }} />
                    <div className="absolute right-0 top-4 z-50 hidden group-hover:block w-56 p-2 rounded-lg text-xs shadow-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                      <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>난이도 절벽 감지</div>
                      연속 레벨 간 급격한 스탯 변화를 감지합니다.
                      <div className="mt-1.5 space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        <div>1.5: 엄격 (50% 증가 경고)</div>
                        <div>2.0: 보통 (100% 증가 경고) - 권장</div>
                        <div>3.0: 관대 (200% 증가만 경고)</div>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  value={config.cliffThreshold}
                  onChange={(e) => setConfig({ ...config, cliffThreshold: parseFloat(e.target.value) || 2 })}
                  step={0.5}
                  min={1.5}
                  max={5}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* 추천 설정 안내 */}
            <div className="p-2 rounded-lg text-xs" style={{ background: 'var(--accent-light)', color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span className="font-medium" style={{ color: 'var(--accent)' }}>추천 설정</span>
              </div>
              <div>처음 사용 시 기본값 권장. 오탐이 많으면 값을 높이고, 문제를 못 찾으면 값을 낮추세요.</div>
            </div>
          </div>
        )}

        {/* 분석 버튼 */}
        <button
          onClick={runAnalysis}
          disabled={!currentSheet || isAnalyzing}
          className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{
            background: isAnalyzing ? 'var(--bg-tertiary)' : 'var(--primary-yellow)',
            color: isAnalyzing ? 'var(--text-secondary)' : 'white'
          }}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              불균형 분석 실행
            </>
          )}
        </button>

        {/* 분석 결과 */}
        {hasAnalyzed && (
          <>
            {/* 요약 */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              {issues.length === 0 ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                    <CheckCircle className="w-5 h-5" style={{ color: 'rgb(34, 197, 94)' }} />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>문제 없음</div>
                    <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>감지된 불균형 패턴이 없습니다</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {issues.length}개의 문제 감지됨
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterSeverity('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterSeverity === 'all' ? 'bg-[var(--accent)] text-white' : ''
                      }`}
                      style={{
                        background: filterSeverity === 'all' ? undefined : 'var(--bg-primary)',
                        color: filterSeverity === 'all' ? undefined : 'var(--text-secondary)'
                      }}
                    >
                      전체 ({issues.length})
                    </button>
                    {severityCounts.critical > 0 && (
                      <button
                        onClick={() => setFilterSeverity('critical')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          filterSeverity === 'critical' ? 'text-white' : ''
                        }`}
                        style={{
                          background: filterSeverity === 'critical' ? 'var(--primary-red)' : 'var(--bg-primary)',
                          color: filterSeverity === 'critical' ? undefined : 'var(--primary-red)'
                        }}
                      >
                        심각 ({severityCounts.critical})
                      </button>
                    )}
                    {severityCounts.warning > 0 && (
                      <button
                        onClick={() => setFilterSeverity('warning')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          filterSeverity === 'warning' ? 'text-white' : ''
                        }`}
                        style={{
                          background: filterSeverity === 'warning' ? 'var(--primary-yellow)' : 'var(--bg-primary)',
                          color: filterSeverity === 'warning' ? undefined : 'var(--primary-yellow)'
                        }}
                      >
                        주의 ({severityCounts.warning})
                      </button>
                    )}
                    {severityCounts.info > 0 && (
                      <button
                        onClick={() => setFilterSeverity('info')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          filterSeverity === 'info' ? 'text-white' : ''
                        }`}
                        style={{
                          background: filterSeverity === 'info' ? 'var(--primary-blue)' : 'var(--bg-primary)',
                          color: filterSeverity === 'info' ? undefined : 'var(--primary-blue)'
                        }}
                      >
                        정보 ({severityCounts.info})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 이슈 목록 */}
            {filteredIssues.length > 0 && (
              <div className="space-y-2">
                {filteredIssues.map(issue => {
                  const Icon = TYPE_ICONS[issue.type] || AlertCircle;
                  const isExpanded = expandedIssues.has(issue.id);
                  const color = getSeverityColor(issue.severity);

                  return (
                    <div
                      key={issue.id}
                      className="rounded-lg overflow-hidden"
                      style={{ border: `1px solid ${color}30` }}
                    >
                      <button
                        onClick={() => toggleIssue(issue.id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                        style={{ background: `${color}10` }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-medium ${isExpanded ? '' : 'truncate'}`}
                            style={{ color: 'var(--text-primary)' }}
                            title={issue.title}
                          >
                            {issue.title}
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {issue.affectedRows.length}개 행 관련
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                        ) : (
                          <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-3 space-y-3" style={{ background: 'var(--bg-primary)' }}>
                          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {issue.description}
                          </div>

                          {issue.suggestion && (
                            <div className="p-2 rounded-lg text-xs" style={{ background: 'var(--bg-tertiary)' }}>
                              <div className="flex items-center gap-1 mb-1">
                                <Info className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                                <span className="font-medium" style={{ color: 'var(--accent)' }}>제안</span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)' }}>{issue.suggestion}</div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1">
                            {issue.affectedColumns.map(colId => {
                              const col = currentSheet?.columns.find(c => c.id === colId);
                              return (
                                <span
                                  key={colId}
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                                >
                                  {col?.name || colId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 시트가 없을 때 */}
        {!currentSheet && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              시트를 선택해주세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
