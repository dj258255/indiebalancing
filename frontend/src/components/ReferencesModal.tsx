'use client';

import { X, BookOpen, ExternalLink, Lightbulb, Calculator, TrendingUp, Coins, Sparkles, Gamepad2, AlertTriangle, CheckCircle } from 'lucide-react';

interface ReferencesModalProps {
  onClose: () => void;
}

interface GuidelineItem {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'info';
}

interface ReferenceItem {
  title: string;
  description: string;
  url: string | null;
  guidelines?: GuidelineItem[];
}

interface ReferenceCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: ReferenceItem[];
}

const referenceCategories: ReferenceCategory[] = [
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
        guidelines: [
          { label: '난이도 증가율', value: '스테이지당 5~15%', status: 'good' },
          { label: '실패 허용 횟수', value: '2~3회 (좌절 방지)', status: 'good' },
          { label: '주의', value: '20% 이상 급증 시 이탈 위험', status: 'warning' },
        ],
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
        guidelines: [
          { label: '감소율 공식 권장', value: 'ATK × (100 / (100 + DEF))', status: 'good' },
          { label: '최소 데미지', value: '공격력의 10~20% 보장', status: 'info' },
          { label: '주의', value: '뺄셈 공식은 방어력 스케일링 어려움', status: 'warning' },
        ],
      },
      {
        title: 'TTK/DPS Analysis',
        description: 'Time To Kill과 Damage Per Second 계산을 통한 무기/스킬 밸런싱. FPS, MOBA, RPG 등 장르별 적정 TTK 기준을 제시합니다.',
        url: null,
        guidelines: [
          { label: 'FPS (택티컬)', value: 'TTK 0.2~0.5초', status: 'info' },
          { label: 'FPS (아레나)', value: 'TTK 0.8~1.5초', status: 'info' },
          { label: 'MOBA', value: 'TTK 2~5초 (팀파이트 기준)', status: 'info' },
          { label: 'RPG 일반몹', value: 'TTK 3~10초', status: 'info' },
          { label: 'RPG 보스', value: 'TTK 60~300초', status: 'info' },
        ],
      },
      {
        title: 'EHP (Effective HP)',
        description: '방어력, 회피율, 피해 감소 등을 종합한 실질 체력 계산. 탱커와 딜러 간의 밸런스 조정에 활용됩니다.',
        url: null,
        guidelines: [
          { label: '탱커 EHP', value: '딜러의 2~3배', status: 'good' },
          { label: '방어력 효율', value: '100 DEF = 50% 감소 권장', status: 'info' },
          { label: '주의', value: 'EHP 5배 이상 차이 시 밸런스 붕괴', status: 'warning' },
        ],
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
        guidelines: [
          { label: '레벨당 증가량', value: '기본값의 5~10%', status: 'good' },
          { label: '적합한 용도', value: '캐주얼 게임, 단순 스탯', status: 'info' },
          { label: '최대 레벨', value: '50~100 권장', status: 'info' },
        ],
      },
      {
        title: 'Exponential Growth (지수)',
        description: 'y = base × ratio^level. 후반부 급격한 성장. 파워 인플레이션 주의 필요.',
        url: null,
        guidelines: [
          { label: '성장 배율', value: '1.05~1.15 (레벨당)', status: 'good' },
          { label: '적합한 용도', value: '경험치 요구량, 강화 비용', status: 'info' },
          { label: '주의', value: '1.2 이상이면 후반 밸런스 붕괴', status: 'warning' },
        ],
      },
      {
        title: 'Logarithmic Growth (로그)',
        description: 'y = base + (multiplier × log(level)). 수확 체감 효과. 초반 급성장, 후반 완만.',
        url: null,
        guidelines: [
          { label: '적합한 용도', value: '스킬 효율, 수확 체감 스탯', status: 'info' },
          { label: '레벨 100 기준', value: '초기값의 3~5배 도달', status: 'good' },
        ],
      },
      {
        title: 'S-Curve (시그모이드)',
        description: '초반 완만 → 중반 급성장 → 후반 수렴. 자연스러운 성장 패턴으로 많은 게임에서 채택.',
        url: null,
        guidelines: [
          { label: '변곡점', value: '전체 레벨의 40~60% 지점', status: 'good' },
          { label: '최대 성장률', value: '변곡점에서 15~25%', status: 'info' },
          { label: '적합한 용도', value: '캐릭터 성장, 자연스러운 파워 커브', status: 'info' },
        ],
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
        guidelines: [
          { label: 'Sink 비율', value: '유입량의 70~90%', status: 'good' },
          { label: '인플레이션 방지', value: 'Sink ≥ Faucet 유지', status: 'info' },
          { label: '주의', value: 'Sink < 50%면 인플레 발생', status: 'warning' },
        ],
      },
      {
        title: 'Currency Hierarchy',
        description: '골드-다이아-프리미엄 등 다층 화폐 구조 설계. 각 화폐의 획득 난이도와 용도를 분리합니다.',
        url: null,
        guidelines: [
          { label: '소프트 화폐 (골드)', value: '일일 100~500회 획득 기회', status: 'info' },
          { label: '하드 화폐 (다이아)', value: '일일 50~200개 무과금 획득', status: 'info' },
          { label: '교환 비율', value: '골드:다이아 = 100~1000:1', status: 'good' },
        ],
      },
      {
        title: 'Time-Money Trade-off',
        description: '무과금 유저의 시간 투자와 과금 유저의 금전 투자 간 균형점 설계.',
        url: null,
        guidelines: [
          { label: '과금 효율', value: '시간 대비 2~5배 효율', status: 'good' },
          { label: '무과금 도달 기간', value: '과금의 3~10배', status: 'info' },
          { label: '주의', value: '20배 이상 차이 시 이탈', status: 'warning' },
        ],
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
        title: 'Pity System (천장)',
        description: '천장 시스템 - 일정 횟수 실패 시 보장 획득. 기대값 계산과 유저 심리를 고려한 설계.',
        url: null,
        guidelines: [
          { label: '천장 횟수', value: '70~100회 (업계 표준)', status: 'good' },
          { label: '기대 비용', value: '최고 등급 1개당 $50~100', status: 'info' },
          { label: '주의', value: '200회 이상 천장은 이탈 위험', status: 'warning' },
          { label: '주의', value: '천장 없음 = 규제 리스크', status: 'warning' },
        ],
      },
      {
        title: 'Soft/Hard Pity',
        description: '소프트 천장(확률 점진적 상승)과 하드 천장(100% 보장)의 조합으로 더 세밀한 확률 조절.',
        url: null,
        guidelines: [
          { label: '소프트 천장 시작', value: '하드 천장의 75~85%', status: 'good' },
          { label: '소프트 천장 확률 증가', value: '회당 5~10%씩 증가', status: 'info' },
          { label: '예시 (원신 기준)', value: '74회 소프트, 90회 하드', status: 'info' },
        ],
      },
      {
        title: '기본 확률 설계',
        description: '등급별 기본 확률 설계. 희귀도와 가치에 따른 확률 배분.',
        url: null,
        guidelines: [
          { label: '최고 등급 (SSR)', value: '0.5~1.0%', status: 'good' },
          { label: '고급 등급 (SR)', value: '5~10%', status: 'info' },
          { label: '일반 등급 (R)', value: '30~50%', status: 'info' },
          { label: '주의', value: '0.1% 이하는 사행성 논란', status: 'warning' },
        ],
      },
      {
        title: 'Expected Attempts',
        description: '목표 달성까지 예상 시도 횟수 계산. 1-(1-p)^n = 목표확률 공식 활용.',
        url: null,
        guidelines: [
          { label: '50% 확률 도달', value: 'n = ln(0.5) / ln(1-p)', status: 'info' },
          { label: '90% 확률 도달', value: 'n = ln(0.1) / ln(1-p)', status: 'info' },
          { label: '1% 확률 기준', value: '69회에 50%, 230회에 90%', status: 'info' },
        ],
      },
    ],
  },
  {
    id: 'stage',
    name: '스테이지/웨이브',
    icon: Gamepad2,
    color: 'bg-blue-100 text-blue-700',
    items: [
      {
        title: '웨이브 파워 스케일링',
        description: '스테이지/웨이브별 적 강화 설계. 난이도 곡선과 보상 밸런스.',
        url: null,
        guidelines: [
          { label: '웨이브당 파워 증가', value: '5~15%', status: 'good' },
          { label: '10웨이브 기준', value: '1웨이브의 1.5~2.5배', status: 'info' },
          { label: '보스 웨이브', value: '일반 웨이브의 2~3배', status: 'info' },
          { label: '주의', value: '20% 이상 급증은 벽 느낌', status: 'warning' },
        ],
      },
      {
        title: '보상 스케일링',
        description: '스테이지별 보상 증가율 설계. 진행 동기 부여와 인플레이션 방지.',
        url: null,
        guidelines: [
          { label: '보상 증가율', value: '난이도 증가율의 80~100%', status: 'good' },
          { label: '시간당 보상', value: '점진적 증가 (로그 곡선)', status: 'info' },
          { label: '주의', value: '보상 < 난이도면 이탈', status: 'warning' },
        ],
      },
      {
        title: '휴식 구간 설계',
        description: '난이도 급증 후 완화 구간 배치. 플레이어 피로도 관리.',
        url: null,
        guidelines: [
          { label: '휴식 구간 주기', value: '5~10 스테이지마다', status: 'good' },
          { label: '난이도 완화', value: '이전 대비 70~80%', status: 'info' },
          { label: '보상 보너스', value: '휴식 구간에서 1.2~1.5배', status: 'info' },
        ],
      },
    ],
  },
];

export default function ReferencesModal({ onClose }: ReferencesModalProps) {
  const getStatusIcon = (status: 'good' | 'warning' | 'info') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />;
      case 'info':
        return <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'var(--primary-blue)' }} />;
    }
  };

  const getStatusStyle = (status: 'good' | 'warning' | 'info') => {
    switch (status) {
      case 'good':
        return { background: 'var(--success-light)', borderColor: 'var(--success)' };
      case 'warning':
        return { background: 'var(--warning-light)', borderColor: 'var(--warning)' };
      case 'info':
        return { background: 'var(--primary-blue-light)', borderColor: 'var(--primary-blue)' };
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl" style={{ background: 'var(--bg-primary)' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b rounded-t-xl" style={{ background: 'linear-gradient(to right, var(--primary-purple), var(--primary-blue))', borderColor: 'transparent' }}>
          <div className="flex items-center gap-3 text-white">
            <BookOpen className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">참고 자료 및 권장 수치 가이드</h2>
              <p className="text-sm text-white/80 mt-0.5">게임 디자인 이론과 실무 권장 수치</p>
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
          <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} /> 권장</span>
                <span className="flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full" style={{ background: 'var(--primary-blue)' }} /> 참고</span>
                <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} /> 주의</span>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              아래 수치는 업계 표준과 성공 사례를 기반으로 한 가이드라인입니다. 게임의 특성에 따라 조정이 필요합니다.
            </p>
          </div>

          <div className="space-y-6">
            {referenceCategories.map((category) => {
              const Icon = category.icon;
              // 카테고리별 색상 매핑
              const categoryColorMap: Record<string, { bg: string; text: string }> = {
                'bg-purple-100 text-purple-700': { bg: 'var(--primary-purple-light)', text: 'var(--primary-purple)' },
                'bg-red-100 text-red-700': { bg: 'var(--error-light)', text: 'var(--error)' },
                'bg-green-100 text-green-700': { bg: 'var(--success-light)', text: 'var(--success)' },
                'bg-yellow-100 text-yellow-700': { bg: 'var(--warning-light)', text: 'var(--warning)' },
                'bg-pink-100 text-pink-700': { bg: 'var(--primary-purple-light)', text: 'var(--primary-purple)' },
                'bg-blue-100 text-blue-700': { bg: 'var(--primary-blue-light)', text: 'var(--primary-blue)' },
              };
              const categoryStyle = categoryColorMap[category.color] || { bg: 'var(--bg-tertiary)', text: 'var(--text-primary)' };
              return (
                <div key={category.id} className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ background: categoryStyle.bg, color: categoryStyle.text }}>
                    <Icon className="w-5 h-5" />
                    <h3 className="font-semibold">{category.name}</h3>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {category.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 transition-colors"
                        style={{ borderColor: 'var(--border-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</h4>
                            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{item.description}</p>

                            {/* 권장 수치 가이드 */}
                            {item.guidelines && item.guidelines.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {item.guidelines.map((guide, gIdx) => (
                                  <div
                                    key={gIdx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs"
                                    style={getStatusStyle(guide.status)}
                                  >
                                    {getStatusIcon(guide.status)}
                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{guide.label}:</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{guide.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm hover:underline whitespace-nowrap"
                              style={{ color: 'var(--primary-blue)' }}
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
          <div className="mt-6 p-4 rounded-lg border" style={{ background: 'var(--primary-purple-light)', borderColor: 'var(--primary-purple)' }}>
            <h4 className="font-medium mb-2" style={{ color: 'var(--primary-purple)' }}>도구에 적용된 주요 기능</h4>
            <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>템플릿 시스템</strong>: 32개의 사전 정의된 시트 템플릿 (스탯, 장비, 스킬, 적, 경제, 가챠, 스테이지)</li>
              <li>• <strong>수식 엔진</strong>: 23개의 게임 특화 함수 (DAMAGE, TTK, DPS, EHP, GACHA_PITY 등)</li>
              <li>• <strong>계산기</strong>: DPS, TTK, EHP, 데미지, 스케일링 실시간 계산</li>
              <li>• <strong>시각화</strong>: 성장 곡선, 레이더 차트, 막대 차트, 히스토그램</li>
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t rounded-b-xl" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              수치는 참고용입니다. 게임의 장르와 타겟 유저에 따라 조정하세요.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
