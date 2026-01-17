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
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '게임 밸런스 툴에 오신 걸 환영합니다',
    description: '이 툴은 게임 기획자가 캐릭터 스탯, 무기 데미지, 레벨 테이블 등을 관리하고 계산하는 도구입니다.',
    tip: '엑셀처럼 사용하되, 게임에 특화된 수식을 바로 쓸 수 있어요.',
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* 진행 표시 바 */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              {TUTORIAL_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    index === currentStep
                      ? 'bg-blue-500 text-white'
                      : completedSteps.has(index)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
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
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            건너뛰기
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="px-8 py-6 min-h-[350px]">
          <h2 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h2>
          <p className="text-gray-600 mb-6">{step.description}</p>

          {/* 액션 가이드 */}
          {step.action && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <MousePointer className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-blue-700 font-medium">{step.action}</span>
            </div>
          )}

          {/* 예제 */}
          {step.example && (
            <div className="bg-gray-900 rounded-lg p-4 mb-4 font-mono text-sm">
              {step.example.before && (
                <div className="text-gray-400 mb-2 text-xs">{`// ${step.example.before}`}</div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Keyboard className="w-4 h-4 text-gray-500" />
                <span className="text-green-400">{step.example.input}</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-300">
                <Play className="w-4 h-4" />
                <span>→ {step.example.result}</span>
              </div>
            </div>
          )}

          {/* 팁 */}
          {step.tip && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-amber-700">{step.tip}</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
