'use client';

import { X, BookOpen, ExternalLink, Lightbulb, Calculator, TrendingUp, Coins, Sparkles, Gamepad2 } from 'lucide-react';

interface ReferencesModalProps {
  onClose: () => void;
}

const referenceCategories = [
  {
    id: 'theory',
    name: '게임 디자인 이론',
    icon: Lightbulb,
    color: 'bg-purple-100 text-purple-700',
    items: [
      {
        title: 'Flow Theory (Csikszentmihalyi)',
        description: '최적의 게임 경험을 위한 난이도-실력 균형 곡선. 플레이어가 지루함과 불안함 사이에서 몰입 상태를 유지하도록 설계합니다.',
        url: 'https://en.wikipedia.org/wiki/Flow_(psychology)',
      },
      {
        title: 'Ian Schreiber - Game Balance Concepts',
        description: '게임 밸런스의 수학적 접근법을 체계적으로 정리한 온라인 강좌. 확률, 성장 곡선, 경제 시스템 등을 다룹니다.',
        url: 'https://gamebalanceconcepts.wordpress.com/',
      },
      {
        title: 'MDA Framework',
        description: 'Mechanics, Dynamics, Aesthetics - 게임 디자인의 핵심 프레임워크로 밸런스 설계의 기초가 됩니다.',
        url: null,
      },
    ],
  },
  {
    id: 'damage',
    name: '전투 시스템 공식',
    icon: Calculator,
    color: 'bg-red-100 text-red-700',
    items: [
      {
        title: 'Damage Formula Patterns',
        description: '공격력 - 방어력, 공격력 × (100 / (100 + 방어력)), 공격력 × (1 - 방어율) 등 다양한 데미지 공식 패턴과 각각의 특성을 분석합니다.',
        url: null,
      },
      {
        title: 'TTK/DPS Analysis',
        description: 'Time To Kill과 Damage Per Second 계산을 통한 무기/스킬 밸런싱. FPS, MOBA, RPG 등 장르별 적정 TTK 기준을 제시합니다.',
        url: null,
      },
      {
        title: 'EHP (Effective HP)',
        description: '방어력, 회피율, 피해 감소 등을 종합한 실질 체력 계산. 탱커와 딜러 간의 밸런스 조정에 활용됩니다.',
        url: null,
      },
    ],
  },
  {
    id: 'growth',
    name: '성장 곡선',
    icon: TrendingUp,
    color: 'bg-green-100 text-green-700',
    items: [
      {
        title: 'Linear Growth (선형)',
        description: 'y = base + (level × increment). 예측 가능하고 직관적인 성장. 초반 강하고 후반 약해지는 특성.',
        url: null,
      },
      {
        title: 'Exponential Growth (지수)',
        description: 'y = base × ratio^level. 후반부 급격한 성장. 파워 인플레이션 주의 필요.',
        url: null,
      },
      {
        title: 'Logarithmic Growth (로그)',
        description: 'y = base + (multiplier × log(level)). 수확 체감 효과. 초반 급성장, 후반 완만.',
        url: null,
      },
      {
        title: 'S-Curve (시그모이드)',
        description: '초반 완만 → 중반 급성장 → 후반 수렴. 자연스러운 성장 패턴으로 많은 게임에서 채택.',
        url: null,
      },
    ],
  },
  {
    id: 'economy',
    name: '경제 시스템',
    icon: Coins,
    color: 'bg-yellow-100 text-yellow-700',
    items: [
      {
        title: 'Faucet-Sink Model',
        description: '자원의 유입(Faucet)과 유출(Sink)을 설계하여 인플레이션을 방지하고 건강한 경제를 유지합니다.',
        url: null,
      },
      {
        title: 'Currency Hierarchy',
        description: '골드-다이아-프리미엄 등 다층 화폐 구조 설계. 각 화폐의 획득 난이도와 용도를 분리합니다.',
        url: null,
      },
      {
        title: 'Time-Money Trade-off',
        description: '무과금 유저의 시간 투자와 과금 유저의 금전 투자 간 균형점 설계.',
        url: null,
      },
    ],
  },
  {
    id: 'gacha',
    name: '가챠/확률 시스템',
    icon: Sparkles,
    color: 'bg-pink-100 text-pink-700',
    items: [
      {
        title: 'Pity System',
        description: '천장 시스템 - 일정 횟수 실패 시 보장 획득. 기대값 계산과 유저 심리를 고려한 설계.',
        url: null,
      },
      {
        title: 'Soft/Hard Pity',
        description: '소프트 천장(확률 점진적 상승)과 하드 천장(100% 보장)의 조합으로 더 세밀한 확률 조절.',
        url: null,
      },
      {
        title: 'Expected Attempts',
        description: '목표 달성까지 예상 시도 횟수 계산. 1-(1-p)^n = 목표확률 공식 활용.',
        url: null,
      },
    ],
  },
  {
    id: 'reference',
    name: 'GDC 및 실무 자료',
    icon: Gamepad2,
    color: 'bg-blue-100 text-blue-700',
    items: [
      {
        title: 'GDC Vault - Balance Talks',
        description: 'Blizzard, Riot, Supercell 등 유수 스튜디오의 밸런싱 노하우가 담긴 GDC 발표 자료들.',
        url: 'https://gdcvault.com/',
      },
      {
        title: 'Slay the Spire Balancing',
        description: '로그라이크 덱빌딩 게임의 데이터 기반 밸런싱 사례. 카드/유물 간 시너지와 승률 분석.',
        url: null,
      },
      {
        title: 'Path of Exile - Complex Systems',
        description: '복잡한 스킬/패시브 시스템의 밸런싱 사례. 다양한 빌드가 공존하는 설계 철학.',
        url: null,
      },
    ],
  },
];

export default function ReferencesModal({ onClose }: ReferencesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-xl">
          <div className="flex items-center gap-3 text-white">
            <BookOpen className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">참고 자료 및 이론적 기반</h2>
              <p className="text-sm text-white/80 mt-0.5">PowerBalance 도구가 기반으로 하는 게임 디자인 이론과 공식</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600 leading-relaxed">
              이 도구는 게임 밸런스 디자인 분야의 검증된 이론과 실무 사례를 기반으로 제작되었습니다.
              아래 자료들은 템플릿 설계, 수식 엔진, 계산기 기능 등에 직접적으로 반영되어 있습니다.
            </p>
          </div>

          <div className="space-y-6">
            {referenceCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.id} className="border rounded-lg overflow-hidden">
                  <div className={`px-4 py-3 flex items-center gap-2 ${category.color}`}>
                    <Icon className="w-5 h-5" />
                    <h3 className="font-semibold">{category.name}</h3>
                  </div>
                  <div className="divide-y">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{item.title}</h4>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                          </div>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                            >
                              <ExternalLink className="w-4 h-4" />
                              자료 보기
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 추가 정보 */}
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="font-medium text-indigo-800 mb-2">도구에 적용된 주요 기능</h4>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• <strong>템플릿 시스템</strong>: 25개의 사전 정의된 시트 템플릿 (스탯, 장비, 스킬, 적, 경제, 가챠, 스테이지)</li>
              <li>• <strong>수식 엔진</strong>: 23개의 게임 특화 함수 (DAMAGE, TTK, DPS, EHP, 성장곡선 등)</li>
              <li>• <strong>계산기</strong>: DPS, TTK, EHP, 데미지, 스케일링 실시간 계산</li>
              <li>• <strong>시각화</strong>: 레이더 차트, 막대 차트, 히스토그램으로 데이터 비교 분석</li>
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              이 자료들은 교육 및 참고 목적으로 제공됩니다.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
