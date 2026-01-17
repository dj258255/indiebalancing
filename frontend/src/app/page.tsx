'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import {
  loadProjects,
  saveAllProjects,
  startAutoSave,
  stopAutoSave,
  startAutoBackup,
  stopAutoBackup,
} from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import SheetTabs from '@/components/SheetTabs';
import SheetTable from '@/components/SheetTable';
import FormulaHelper from '@/components/FormulaHelper';
import GrowthCurveChart from '@/components/GrowthCurveChart';
import OnboardingGuide, { useOnboardingStatus } from '@/components/OnboardingGuide';
import Calculator from '@/components/Calculator';
import ComparisonChart from '@/components/ComparisonChart';
import ReferencesModal from '@/components/ReferencesModal';
import { FileSpreadsheet, Plus, X, ArrowRight, Loader2 } from 'lucide-react';

export default function Home() {
  const {
    projects,
    loadProjects: setProjects,
    setLastSaved,
    getCurrentProject,
    getCurrentSheet,
    createSheet,
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const { showOnboarding, setShowOnboarding } = useOnboardingStatus();

  const currentProject = getCurrentProject();
  const currentSheet = getCurrentSheet();

  // 초기 데이터 로드
  useEffect(() => {
    const init = async () => {
      try {
        const savedProjects = await loadProjects();
        if (savedProjects.length > 0) {
          setProjects(savedProjects);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [setProjects]);

  // 자동 저장 설정
  useEffect(() => {
    if (!isLoading) {
      startAutoSave(
        () => useProjectStore.getState().projects,
        () => setLastSaved(Date.now()),
        30000 // 30초마다 저장
      );

      startAutoBackup(
        () => useProjectStore.getState().projects,
        () => console.log('Backup created'),
        300000 // 5분마다 백업
      );

      return () => {
        stopAutoSave();
        stopAutoBackup();
      };
    }
  }, [isLoading, setLastSaved]);

  // 프로젝트 변경 시 저장
  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      const timeout = setTimeout(() => {
        saveAllProjects(projects);
        setLastSaved(Date.now());
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [projects, isLoading, setLastSaved]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg-secondary)' }}>
      {/* 사이드바 */}
      <Sidebar
        onShowChart={() => setShowChart(true)}
        onShowHelp={() => setShowOnboarding(true)}
        onShowCalculator={() => setShowCalculator(true)}
        onShowComparison={() => setShowComparison(true)}
        onShowReferences={() => setShowReferences(true)}
      />

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentProject ? (
          <>
            {/* 시트 탭 */}
            <SheetTabs project={currentProject} />

            {/* 시트 내용 */}
            <div className="flex-1 overflow-hidden flex">
              {currentSheet ? (
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{currentSheet.name}</h2>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {currentSheet.rows.length}개 행 · {currentSheet.columns.length}개 컬럼
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <SheetTable projectId={currentProject.id} sheet={currentSheet} />
                  </div>

                  {/* 수식 도우미 */}
                  <div className="mt-4">
                    <FormulaHelper />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4" style={{
                    background: 'var(--accent-light)'
                  }}>
                    <FileSpreadsheet className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>시트가 없습니다</p>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>새 시트를 만들어 데이터를 관리해보세요</p>
                  <button
                    onClick={() => createSheet(currentProject.id, '새 시트')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
                    style={{
                      background: 'var(--accent)',
                      color: 'white'
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    새 시트 만들기
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-lg text-center">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                인디밸런싱
              </h1>
              <p className="text-lg mb-8" style={{ color: 'var(--text-tertiary)' }}>
                인디게임 개발자를 위한 밸런스 데이터 관리 툴
              </p>

              {/* 기능 카드 */}
              <div className="card p-6 text-left mb-6">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>주요 기능</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FeatureItem
                    title="게임 특화 수식"
                    desc="DAMAGE, DPS, TTK, EHP 등"
                  />
                  <FeatureItem
                    title="시트 간 연동"
                    desc="REF 함수로 데이터 참조"
                  />
                  <FeatureItem
                    title="성장 곡선"
                    desc="Linear, Exponential, S-Curve"
                  />
                  <FeatureItem
                    title="자동 저장"
                    desc="브라우저 저장, JSON 내보내기"
                  />
                </div>
              </div>

              {/* 시작 안내 */}
              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <span>왼쪽 사이드바에서</span>
                <span className="font-semibold px-2 py-1 rounded" style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent)'
                }}>새 프로젝트</span>
                <span>를 만들어 시작하세요</span>
                <ArrowRight className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 성장 곡선 차트 모달 */}
      {showChart && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="sticky top-0 border-b px-6 py-4 flex items-center justify-between" style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)'
            }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>성장 곡선 차트</h2>
              <button
                onClick={() => setShowChart(false)}
                className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <GrowthCurveChart />
            </div>
          </div>
        </div>
      )}

      {/* 온보딩 가이드 */}
      {showOnboarding && (
        <OnboardingGuide onClose={() => setShowOnboarding(false)} />
      )}

      {/* 계산기 모달 */}
      {showCalculator && (
        <Calculator onClose={() => setShowCalculator(false)} />
      )}

      {/* 비교/분석 차트 모달 */}
      {showComparison && (
        <ComparisonChart onClose={() => setShowComparison(false)} />
      )}

      {/* 참고 자료 모달 */}
      {showReferences && (
        <ReferencesModal onClose={() => setShowReferences(false)} />
      )}
    </div>
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</div>
      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{desc}</div>
    </div>
  );
}
