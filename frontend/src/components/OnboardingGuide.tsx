'use client';

import { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle2,
  Lightbulb,
  MousePointer,
  Keyboard,
  Target,
  TrendingUp,
  Coins,
  Sparkles,
  Layers,
  Swords,
} from 'lucide-react';

interface OnboardingGuideProps {
  onClose: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  example?: {
    before?: string;
    input: string;
    result: string;
  };
  tip?: string;
  isGuidelinesStep?: boolean;
}

// 권장 수치 가이드라인 데이터
const GUIDELINES_DATA = [
  {
    id: 'ttk',
    icon: Swords,
    title: 'TTK (Time To Kill)',
    color: 'red',
    items: [
      { label: 'FPS/슈터', value: '0.3~1.5초', desc: '빠른 전투, 높은 긴장감' },
      { label: 'MOBA', value: '3~8초', desc: '팀 협동 여유' },
      { label: 'MMO/RPG', value: '5~30초', desc: '전략적 스킬 사용' },
    ],
  },
  {
    id: 'damage',
    icon: Target,
    title: '데미지 공식',
    color: 'orange',
    items: [
      { label: '최소 데미지', value: '공격력의 10~20%', desc: '0 데미지 방지' },
      { label: '방어력 감소율', value: '50~70% 상한', desc: '탱커도 죽을 수 있게' },
      { label: 'EHP 비율', value: '탱커 2~3배', desc: '탱커가 딜러보다 버티는 시간' },
    ],
  },
  {
    id: 'growth',
    icon: TrendingUp,
    title: '성장 곡선',
    color: 'green',
    items: [
      { label: '선형 (Linear)', value: '레벨당 +5~10%', desc: '예측 쉬움, 후반 약함' },
      { label: '지수 (Exponential)', value: '1.05~1.15 배율', desc: '후반 급성장' },
      { label: '로그 (Logarithmic)', value: 'ln(레벨) 계수', desc: '초반 빠름, 후반 완만' },
    ],
  },
  {
    id: 'economy',
    icon: Coins,
    title: '경제 시스템',
    color: 'yellow',
    items: [
      { label: 'Faucet-Sink 비율', value: '획득:소비 = 1:0.7~0.9', desc: '약간의 잉여 허용' },
      { label: '화폐 교환율', value: '프리미엄 1 = 일반 100', desc: '과금 가치 체감' },
      { label: '인플레이션율', value: '주당 2~5%', desc: '장기 운영 기준' },
    ],
  },
  {
    id: 'gacha',
    icon: Sparkles,
    title: '가챠/뽑기',
    color: 'purple',
    items: [
      { label: '최고 등급 확률', value: '0.5~3%', desc: '희귀성 유지' },
      { label: '천장 (Pity)', value: '70~100회', desc: '업계 표준' },
      { label: '기대 비용', value: '최고 1개당 $50~100', desc: '과금 설계 기준' },
    ],
  },
  {
    id: 'flow',
    icon: Layers,
    title: '몰입 이론 (Flow)',
    color: 'blue',
    items: [
      { label: '난이도 증가율', value: '스테이지당 5~15%', desc: '점진적 도전' },
      { label: '실패 허용 횟수', value: '2~3회', desc: '좌절 전 재시도' },
      { label: '보상 간격', value: '3~5분', desc: '작은 성취감 유지' },
    ],
  },
];

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '게임 밸런스 툴에 오신 걸 환영합니다',
    description: '이 툴은 게임 기획자가 캐릭터 스탯, 무기 데미지, 레벨 테이블 등을 관리하고 계산하는 도구입니다.',
    tip: '엑셀처럼 사용하되, 게임에 특화된 수식을 바로 쓸 수 있어요.',
  },
  {
    id: 'guidelines',
    title: '권장 수치 가이드',
    description: '게임 밸런싱에 자주 사용되는 업계 표준 수치들입니다. 작업할 때 참고하세요.',
    tip: '이 가이드는 상단 메뉴의 "레퍼런스"에서 언제든 다시 볼 수 있어요.',
    isGuidelinesStep: true,
  },
  {
    id: 'create-project',
    title: '1단계: 프로젝트 만들기',
    description: '왼쪽 사이드바에서 "새 프로젝트" 버튼을 클릭하세요.',
    action: '새 프로젝트 → 이름 입력 → Enter',
    tip: '프로젝트 = 하나의 게임. 여러 게임을 따로 관리할 수 있어요.',
  },
  {
    id: 'create-sheet',
    title: '2단계: 시트 만들기',
    description: '프로젝트 안에 데이터 시트를 만듭니다. 상단 탭의 "+" 버튼을 클릭하세요.',
    action: '+ 버튼 → 템플릿 선택 또는 빈 시트',
    tip: '템플릿을 쓰면 RPG 캐릭터, FPS 무기 등 기본 구조가 자동 생성됩니다.',
  },
  {
    id: 'input-data',
    title: '3단계: 데이터 입력하기',
    description: '셀을 클릭하면 바로 입력할 수 있습니다. 숫자나 텍스트를 입력하세요.',
    action: '셀 클릭 → 값 입력 → Enter',
    example: {
      input: '150',
      result: '150 (숫자로 저장됨)',
    },
    tip: 'Enter로 확정, Esc로 취소',
  },
  {
    id: 'formula-basic',
    title: '4단계: 수식 사용하기 (핵심!)',
    description: '셀에 = 로 시작하면 수식으로 인식됩니다. 다른 셀 값을 참조하거나 계산할 수 있어요.',
    action: '셀 클릭 → = 입력 → 수식 작성 → Enter',
    example: {
      before: 'ATK 컬럼에 100이 있을 때',
      input: '=ATK * 1.5',
      result: '150 (ATK의 1.5배)',
    },
    tip: '컬럼 이름으로 같은 행의 다른 값을 참조합니다.',
  },
  {
    id: 'formula-damage',
    title: '5단계: 게임 수식 - DAMAGE',
    description: '게임에서 자주 쓰는 데미지 계산 공식이 내장되어 있습니다.',
    example: {
      before: '공격력 100, 방어력 50일 때',
      input: '=DAMAGE(100, 50)',
      result: '66.67 (감소율 공식 적용)',
    },
    tip: '공식: ATK × (100 ÷ (100 + DEF)). 방어력이 높을수록 데미지 감소.',
  },
  {
    id: 'formula-dps',
    title: '6단계: 게임 수식 - DPS',
    description: '초당 데미지(DPS)를 계산합니다. 크리티컬도 포함됩니다.',
    example: {
      before: '데미지 50, 공속 2, 크리율 20%, 크뎀 150%',
      input: '=DPS(50, 2, 0.2, 1.5)',
      result: '110 (크리티컬 반영 DPS)',
    },
    tip: '공식: 데미지 × 공속 × (1 + 크리율 × (크뎀 - 1))',
  },
  {
    id: 'formula-scale',
    title: '7단계: 게임 수식 - SCALE',
    description: '레벨에 따른 스탯 성장을 계산합니다. 선형, 지수, 로그 등 다양한 곡선 지원.',
    example: {
      before: '기본값 100, 레벨 10, 성장률 1.1',
      input: '=SCALE(100, 10, 1.1, "exponential")',
      result: '259.37 (지수 성장)',
    },
    tip: '곡선 종류: "linear", "exponential", "logarithmic", "quadratic"',
  },
  {
    id: 'done',
    title: '준비 완료!',
    description: '이제 직접 사용해보세요. 수식 도우미(화면 하단)에서 모든 함수 목록을 볼 수 있습니다.',
    tip: '막히면 수식 도우미의 "테스트" 기능으로 먼저 확인해보세요.',
  },
];

export default function OnboardingGuide({ onClose }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('powerbalance_onboarding_completed', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('powerbalance_onboarding_completed', 'true');
    onClose();
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {/* 진행 표시 바 */}
        <div className="h-1" style={{ background: 'var(--bg-tertiary)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%`,
              background: 'var(--primary-blue)'
            }}
          />
        </div>

        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {TUTORIAL_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: index === currentStep
                      ? 'var(--primary-blue)'
                      : completedSteps.has(index)
                      ? 'var(--success-light)'
                      : 'var(--bg-hover)',
                    color: index === currentStep
                      ? 'white'
                      : completedSteps.has(index)
                      ? 'var(--success)'
                      : 'var(--text-tertiary)'
                  }}
                >
                  {completedSteps.has(index) ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            건너뛰기
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className={`px-8 py-6 ${step.isGuidelinesStep ? 'min-h-[450px]' : 'min-h-[350px]'}`}>
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{step.title}</h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{step.description}</p>

          {/* 권장 수치 가이드라인 UI */}
          {step.isGuidelinesStep && (
            <div className="grid grid-cols-2 gap-3 mb-4 max-h-[280px] overflow-y-auto pr-2">
              {GUIDELINES_DATA.map((category) => {
                const IconComponent = category.icon;
                const colorStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                  red: { bg: 'var(--error-light)', border: 'var(--error)', text: 'var(--error)', icon: 'var(--error)' },
                  orange: { bg: 'var(--warning-light)', border: 'var(--warning)', text: 'var(--warning)', icon: 'var(--warning)' },
                  green: { bg: 'var(--success-light)', border: 'var(--success)', text: 'var(--success)', icon: 'var(--success)' },
                  yellow: { bg: 'var(--warning-light)', border: 'var(--warning)', text: 'var(--warning)', icon: 'var(--warning)' },
                  purple: { bg: 'var(--primary-purple-light)', border: 'var(--primary-purple)', text: 'var(--primary-purple)', icon: 'var(--primary-purple)' },
                  blue: { bg: 'var(--primary-blue-light)', border: 'var(--primary-blue)', text: 'var(--primary-blue)', icon: 'var(--primary-blue)' },
                };
                const style = colorStyles[category.color];
                return (
                  <div
                    key={category.id}
                    className="p-3 rounded-lg border"
                    style={{ background: style.bg, borderColor: style.border }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconComponent className="w-4 h-4" style={{ color: style.icon }} />
                      <span className="font-semibold text-sm" style={{ color: style.text }}>{category.title}</span>
                    </div>
                    <div className="space-y-1">
                      {category.items.map((item, idx) => (
                        <div key={idx} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">{item.label}:</span>{' '}
                          <span className="opacity-90">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 액션 가이드 */}
          {step.action && (
            <div
              className="flex items-center gap-2 mb-4 p-3 rounded-lg"
              style={{ background: 'var(--primary-blue-light)' }}
            >
              <MousePointer className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary-blue)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--primary-blue)' }}>{step.action}</span>
            </div>
          )}

          {/* 예제 */}
          {step.example && (
            <div
              className="rounded-lg p-4 mb-4 font-mono text-sm"
              style={{ background: 'var(--bg-sidebar)' }}
            >
              {step.example.before && (
                <div className="mb-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{`// ${step.example.before}`}</div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Keyboard className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ color: 'var(--success)' }}>{step.example.input}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                <Play className="w-4 h-4" />
                <span>→ {step.example.result}</span>
              </div>
            </div>
          )}

          {/* 팁 */}
          {step.tip && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg"
              style={{ background: 'var(--warning-light)' }}
            >
              <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
              <span className="text-sm" style={{ color: 'var(--warning)' }}>{step.tip}</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-5 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--primary-blue)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? (
                '시작하기'
              ) : (
                <>
                  다음
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 온보딩 완료 여부 확인 훅
export function useOnboardingStatus() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('powerbalance_onboarding_completed');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem('powerbalance_onboarding_completed');
    setShowOnboarding(true);
  };

  return { showOnboarding, setShowOnboarding, resetOnboarding };
}
