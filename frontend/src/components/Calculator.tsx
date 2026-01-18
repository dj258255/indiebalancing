'use client';

import { useState, useMemo } from 'react';
import { X, Calculator as CalcIcon, Crosshair, Zap, Shield, TrendingUp, Download, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DPS, TTK, EHP, DAMAGE, SCALE } from '@/lib/formulaEngine';
import { useProjectStore } from '@/stores/projectStore';

// 행 표시명 생성 헬퍼
function getRowDisplayName(rowId: string, currentSheet: { name: string; rows: { id: string }[] } | undefined): string {
  if (!currentSheet) return '행';
  const rowIndex = currentSheet.rows.findIndex(r => r.id === rowId);
  return `${currentSheet.name} - ${rowIndex + 1}행`;
}

interface CalculatorProps {
  onClose: () => void;
}

type CalculatorTab = 'dps' | 'ttk' | 'ehp' | 'damage' | 'scale';

// 각 탭별 도움말 정보
const TAB_HELP = {
  dps: {
    title: 'DPS (Damage Per Second)',
    description: '1초 동안 적에게 줄 수 있는 총 데미지입니다.',
    terms: [
      { name: '데미지', desc: '한 번 공격 시 피해량' },
      { name: '공격 속도', desc: '초당 공격 횟수' },
      { name: '크리티컬 확률', desc: '치명타 확률 (0~1)' },
      { name: '크리티컬 배율', desc: '치명타 데미지 배수' },
    ],
    example: '검 A: 100×1.0=100 DPS, 검 B: 50×2.5=125 DPS',
    useCase: '무기 비교, 빌드 최적화',
  },
  ttk: {
    title: 'TTK (Time To Kill)',
    description: '적을 처치하는 데 걸리는 시간입니다.',
    terms: [
      { name: '적 HP', desc: '적의 체력' },
      { name: '데미지', desc: '1회 공격 피해량' },
      { name: '공격 속도', desc: '초당 공격 횟수' },
    ],
    example: 'HP 1000, 데미지 100, 공속 2.0 → TTK: 4.5초',
    useCase: 'FPS 무기 밸런싱, PvP 조정',
  },
  ehp: {
    title: 'EHP (Effective HP)',
    description: '방어력을 고려한 실질 체력입니다.',
    terms: [
      { name: 'HP', desc: '기본 체력' },
      { name: '방어력', desc: '피해 감소 스탯' },
      { name: '피해 감소율', desc: '% 피해 감소 (0~1)' },
    ],
    example: 'HP 1000, 방어력 100 → EHP: 2000',
    useCase: '탱커 생존력 비교',
  },
  damage: {
    title: 'DAMAGE (최종 데미지)',
    description: '방어력에 의해 감소된 데미지를 계산합니다.',
    terms: [
      { name: '공격력', desc: '기본 데미지' },
      { name: '방어력', desc: '방어 스탯' },
      { name: '스킬 배율', desc: '데미지 배율' },
    ],
    example: '공격력 100 vs 방어력 100 → 데미지: 50',
    useCase: '전투 데미지 예측',
  },
  scale: {
    title: 'SCALE (성장 계산)',
    description: '레벨업 시 스탯 증가를 계산합니다.',
    terms: [
      { name: '기본값', desc: '레벨 1 스탯' },
      { name: '레벨', desc: '목표 레벨' },
      { name: '성장률', desc: '레벨당 증가율' },
      { name: '곡선 타입', desc: '선형/지수/로그/2차' },
    ],
    example: '기본값 100, 레벨 50, 성장률 1.1 → 11,739',
    useCase: '레벨 테이블 설계',
  },
};

// 곡선 타입별 상세 설명
const CURVE_TYPE_HELP: Record<string, { name: string; formula: string; description: string; useCase: string }> = {
  linear: {
    name: '선형 (Linear)',
    formula: 'base + (level - 1) × rate',
    description: '레벨마다 일정하게 증가합니다. 예측 가능하고 직관적입니다.',
    useCase: '캐주얼 게임, 초보자 친화적 밸런스. 레벨 1→50에서 스탯이 동일하게 증가.',
  },
  exponential: {
    name: '지수 (Exponential)',
    formula: 'base × (rate ^ (level - 1))',
    description: '레벨이 높아질수록 급격하게 증가합니다. 후반 하드코어 느낌.',
    useCase: '경험치 테이블, 강화 비용, MMO 후반 콘텐츠. 고레벨 유저와 저레벨 유저 간 큰 격차.',
  },
  logarithmic: {
    name: '로그 (Logarithmic)',
    formula: 'base + rate × log(level)',
    description: '초반에 빠르게 성장하고 후반으로 갈수록 둔화됩니다.',
    useCase: '레벨 격차 줄이기, 캐치업 시스템. 고레벨 간 스탯 차이를 작게 유지.',
  },
  quadratic: {
    name: '2차 (Quadratic)',
    formula: 'base + rate × level²',
    description: '초반은 느리고 점점 가속되어 증가합니다.',
    useCase: '스킬 데미지 스케일링, 중후반 파워 스파이크. RPG 스킬 계수.',
  },
};

export default function Calculator({ onClose }: CalculatorProps) {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('dps');
  const [showHelp, setShowHelp] = useState(false);
  const { selectedRows, clearSelectedRows, deselectRow, projects, currentProjectId, currentSheetId } = useProjectStore();

  // 현재 시트 가져오기
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  // DPS 계산기 상태
  const [dpsInputs, setDpsInputs] = useState({
    damage: 100,
    attackSpeed: 1.5,
    critRate: 0.2,
    critDamage: 2.0,
  });

  // TTK 계산기 상태
  const [ttkInputs, setTtkInputs] = useState({
    targetHP: 1000,
    damage: 100,
    attackSpeed: 1.5,
  });

  // EHP 계산기 상태
  const [ehpInputs, setEhpInputs] = useState({
    hp: 1000,
    def: 50,
    damageReduction: 0,
  });

  // DAMAGE 계산기 상태
  const [damageInputs, setDamageInputs] = useState({
    atk: 150,
    def: 50,
    multiplier: 1,
  });

  // SCALE 계산기 상태
  const [scaleInputs, setScaleInputs] = useState({
    base: 100,
    level: 10,
    rate: 1.1,
    curveType: 'linear' as string,
  });

  // 계산 결과들
  const dpsResult = useMemo(() => {
    return DPS(dpsInputs.damage, dpsInputs.attackSpeed, dpsInputs.critRate, dpsInputs.critDamage);
  }, [dpsInputs]);

  const ttkResult = useMemo(() => {
    const ttk = TTK(ttkInputs.targetHP, ttkInputs.damage, ttkInputs.attackSpeed);
    const hitsNeeded = Math.ceil(ttkInputs.targetHP / ttkInputs.damage);
    return { ttk, hitsNeeded };
  }, [ttkInputs]);

  const ehpResult = useMemo(() => {
    return EHP(ehpInputs.hp, ehpInputs.def, ehpInputs.damageReduction);
  }, [ehpInputs]);

  const damageResult = useMemo(() => {
    return DAMAGE(damageInputs.atk, damageInputs.def, damageInputs.multiplier);
  }, [damageInputs]);

  const scaleResult = useMemo(() => {
    return SCALE(scaleInputs.base, scaleInputs.level, scaleInputs.rate, scaleInputs.curveType);
  }, [scaleInputs]);

  // 레벨별 스케일 데이터 (그래프용)
  const scaleData = useMemo(() => {
    const data = [];
    for (let lv = 1; lv <= 100; lv += 5) {
      data.push({
        level: lv,
        value: SCALE(scaleInputs.base, lv, scaleInputs.rate, scaleInputs.curveType),
      });
    }
    return data;
  }, [scaleInputs]);

  const tabs = [
    { id: 'dps' as const, name: 'DPS', icon: Zap },
    { id: 'ttk' as const, name: 'TTK', icon: Crosshair },
    { id: 'ehp' as const, name: 'EHP', icon: Shield },
    { id: 'damage' as const, name: 'DAMAGE', icon: CalcIcon },
    { id: 'scale' as const, name: 'SCALE', icon: TrendingUp },
  ];

  const loadFromSelectedRow = (row: typeof selectedRows[0]) => {
    if (activeTab === 'dps') {
      const damage = Number(row.values['데미지'] || row.values['damage'] || row.values['공격력'] || row.values['ATK'] || 0);
      const attackSpeed = Number(row.values['공격속도'] || row.values['attackSpeed'] || row.values['공속'] || 1);
      const critRate = Number(row.values['크리율'] || row.values['critRate'] || 0);
      const critDamage = Number(row.values['크리뎀'] || row.values['critDamage'] || 2);
      setDpsInputs({ damage, attackSpeed, critRate, critDamage });
    } else if (activeTab === 'ttk') {
      const targetHP = Number(row.values['HP'] || row.values['체력'] || 1000);
      const damage = Number(row.values['데미지'] || row.values['damage'] || row.values['공격력'] || 100);
      const attackSpeed = Number(row.values['공격속도'] || row.values['attackSpeed'] || 1);
      setTtkInputs({ targetHP, damage, attackSpeed });
    } else if (activeTab === 'ehp') {
      const hp = Number(row.values['HP'] || row.values['체력'] || 1000);
      const def = Number(row.values['방어력'] || row.values['DEF'] || 0);
      const damageReduction = Number(row.values['피해감소'] || 0);
      setEhpInputs({ hp, def, damageReduction });
    } else if (activeTab === 'damage') {
      const atk = Number(row.values['공격력'] || row.values['ATK'] || 100);
      const def = Number(row.values['방어력'] || row.values['DEF'] || 0);
      const multiplier = Number(row.values['배율'] || 1);
      setDamageInputs({ atk, def, multiplier });
    } else if (activeTab === 'scale') {
      const base = Number(row.values['기본값'] || row.values['base'] || 100);
      const level = Number(row.values['레벨'] || row.values['level'] || 1);
      const rate = Number(row.values['성장률'] || row.values['rate'] || 1.1);
      setScaleInputs({ ...scaleInputs, base, level, rate });
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="card w-full max-w-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col animate-fadeIn">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <CalcIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>게임 밸런스 계산기</h2>
              <p className="text-xs sm:text-sm hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>TTK, DPS, EHP 빠른 계산</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 - 반응형 */}
        <div className="flex items-center border-b px-2 sm:px-4 gap-0.5 sm:gap-1 overflow-x-auto" style={{ borderColor: 'var(--border-primary)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 border-b-2 transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-current'
                    : 'border-transparent'
                )}
                style={{
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">{tab.name}</span>
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: showHelp ? 'var(--accent-light)' : 'var(--bg-tertiary)',
              color: showHelp ? 'var(--accent-text)' : 'var(--text-secondary)'
            }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            도움말
            {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* 현재 탭 도움말 */}
        {showHelp && (
          <div className="px-6 py-4 border-b animate-fadeIn" style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)'
          }}>
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {TAB_HELP[activeTab].title}
              </h4>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{TAB_HELP[activeTab].description}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {TAB_HELP[activeTab].terms.map((term, i) => (
                <div key={i} className="badge badge-primary">
                  <span className="font-medium">{term.name}</span>
                  <span className="mx-1 opacity-50">·</span>
                  <span className="opacity-75">{term.desc}</span>
                </div>
              ))}
            </div>

            <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
              예시: {TAB_HELP[activeTab].example}
            </div>
          </div>
        )}

        {/* 선택된 행에서 값 불러오기 */}
        {selectedRows.length > 0 && (
          <div className="px-6 py-3 border-b" style={{
            background: 'var(--accent-light)',
            borderColor: 'var(--border-primary)'
          }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-text)' }}>
                <Download className="w-4 h-4" />
                <span className="font-medium">선택된 데이터 ({selectedRows.length}개)</span>
              </div>
              <button
                onClick={clearSelectedRows}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--accent-text)' }}
              >
                전체 해제
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRows.map((row) => (
                <div
                  key={row.rowId}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)'
                  }}
                >
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{getRowDisplayName(row.rowId, currentSheet)}</span>
                  <button
                    onClick={() => loadFromSelectedRow(row)}
                    className="px-2 py-0.5 rounded text-xs transition-colors"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    불러오기
                  </button>
                  <button
                    onClick={() => deselectRow(row.rowId)}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* DPS 계산기 */}
          {activeTab === 'dps' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="데미지 (1회 공격)"
                  value={dpsInputs.damage}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, damage: v })}
                />
                <InputField
                  label="공격 속도 (초당)"
                  value={dpsInputs.attackSpeed}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, attackSpeed: v })}
                  step={0.1}
                />
                <InputField
                  label="크리티컬 확률 (0~1)"
                  value={dpsInputs.critRate}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, critRate: v })}
                  step={0.01}
                  min={0}
                  max={1}
                />
                <InputField
                  label="크리티컬 배율"
                  value={dpsInputs.critDamage}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, critDamage: v })}
                  step={0.1}
                />
              </div>

              <ResultCard
                label="DPS 결과"
                value={dpsResult.toFixed(2)}
                color="var(--accent)"
                extra={`기본 DPS: ${(dpsInputs.damage * dpsInputs.attackSpeed).toFixed(2)} | 크리티컬 보정: +${((dpsResult / (dpsInputs.damage * dpsInputs.attackSpeed) - 1) * 100).toFixed(1)}%`}
              />
            </div>
          )}

          {/* TTK 계산기 */}
          {activeTab === 'ttk' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label="적 HP"
                  value={ttkInputs.targetHP}
                  onChange={(v) => setTtkInputs({ ...ttkInputs, targetHP: v })}
                />
                <InputField
                  label="데미지 (1회)"
                  value={ttkInputs.damage}
                  onChange={(v) => setTtkInputs({ ...ttkInputs, damage: v })}
                />
                <InputField
                  label="공격 속도"
                  value={ttkInputs.attackSpeed}
                  onChange={(v) => setTtkInputs({ ...ttkInputs, attackSpeed: v })}
                  step={0.1}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ResultCard
                  label="TTK (처치 시간)"
                  value={ttkResult.ttk === Infinity ? '∞' : `${ttkResult.ttk.toFixed(2)}초`}
                  color="var(--error)"
                />
                <ResultCard
                  label="필요 타격 횟수"
                  value={`${ttkResult.hitsNeeded}회`}
                  color="var(--warning)"
                />
              </div>
            </div>
          )}

          {/* EHP 계산기 */}
          {activeTab === 'ehp' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label="HP"
                  value={ehpInputs.hp}
                  onChange={(v) => setEhpInputs({ ...ehpInputs, hp: v })}
                />
                <InputField
                  label="방어력 (DEF)"
                  value={ehpInputs.def}
                  onChange={(v) => setEhpInputs({ ...ehpInputs, def: v })}
                />
                <InputField
                  label="피해 감소율 (0~0.99)"
                  value={ehpInputs.damageReduction}
                  onChange={(v) => setEhpInputs({ ...ehpInputs, damageReduction: v })}
                  step={0.01}
                  min={0}
                  max={0.99}
                />
              </div>

              <ResultCard
                label="유효 체력 (EHP)"
                value={ehpResult.toFixed(0)}
                color="var(--accent)"
                extra={`원본 HP 대비 ${((ehpResult / ehpInputs.hp) * 100).toFixed(1)}% (×${(ehpResult / ehpInputs.hp).toFixed(2)})`}
              />
            </div>
          )}

          {/* DAMAGE 계산기 */}
          {activeTab === 'damage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label="공격력 (ATK)"
                  value={damageInputs.atk}
                  onChange={(v) => setDamageInputs({ ...damageInputs, atk: v })}
                />
                <InputField
                  label="방어력 (DEF)"
                  value={damageInputs.def}
                  onChange={(v) => setDamageInputs({ ...damageInputs, def: v })}
                />
                <InputField
                  label="스킬 배율"
                  value={damageInputs.multiplier}
                  onChange={(v) => setDamageInputs({ ...damageInputs, multiplier: v })}
                  step={0.1}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ResultCard
                  label="최종 데미지"
                  value={damageResult.toFixed(1)}
                  color="var(--warning)"
                />
                <ResultCard
                  label="데미지 감소율"
                  value={`${((1 - 100 / (100 + damageInputs.def)) * 100).toFixed(1)}%`}
                  color="var(--text-secondary)"
                />
              </div>
            </div>
          )}

          {/* SCALE 계산기 */}
          {activeTab === 'scale' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="기본값 (Base)"
                  value={scaleInputs.base}
                  onChange={(v) => setScaleInputs({ ...scaleInputs, base: v })}
                />
                <InputField
                  label="레벨"
                  value={scaleInputs.level}
                  onChange={(v) => setScaleInputs({ ...scaleInputs, level: v })}
                />
                <InputField
                  label="성장률 (Rate)"
                  value={scaleInputs.rate}
                  onChange={(v) => setScaleInputs({ ...scaleInputs, rate: v })}
                  step={0.01}
                />
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    곡선 타입
                  </label>
                  <select
                    value={scaleInputs.curveType}
                    onChange={(e) => setScaleInputs({ ...scaleInputs, curveType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg"
                  >
                    <option value="linear">Linear (선형)</option>
                    <option value="exponential">Exponential (지수)</option>
                    <option value="logarithmic">Logarithmic (로그)</option>
                    <option value="quadratic">Quadratic (2차)</option>
                  </select>
                </div>
              </div>

              {/* 선택된 곡선 타입 설명 */}
              {CURVE_TYPE_HELP[scaleInputs.curveType] && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--accent-light)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                      {CURVE_TYPE_HELP[scaleInputs.curveType].name}
                    </span>
                    <code className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      {CURVE_TYPE_HELP[scaleInputs.curveType].formula}
                    </code>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {CURVE_TYPE_HELP[scaleInputs.curveType].description}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    사용처: {CURVE_TYPE_HELP[scaleInputs.curveType].useCase}
                  </p>
                </div>
              )}

              <ResultCard
                label={`레벨 ${scaleInputs.level} 스탯`}
                value={scaleResult.toFixed(1)}
                color="var(--success)"
              />

              {/* 간단한 레벨별 표 */}
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--bg-tertiary)' }}>
                    <tr>
                      <th className="px-3 py-2 text-left" style={{ color: 'var(--text-secondary)' }}>레벨</th>
                      {scaleData.slice(0, 8).map((d) => (
                        <th key={d.level} className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{d.level}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>값</td>
                      {scaleData.slice(0, 8).map((d) => (
                        <td key={d.level} className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{d.value.toFixed(0)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        min={min}
        max={max}
        className="w-full px-3 py-2 rounded-lg"
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  color,
  extra,
}: {
  label: string;
  value: string;
  color: string;
  extra?: string;
}) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      {extra && (
        <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>{extra}</div>
      )}
    </div>
  );
}
