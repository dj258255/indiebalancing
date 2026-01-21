'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  Swords,
  Heart,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  X,
  Target,
  Zap,
  Play,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceValidatorProps {
  onClose?: () => void;
}

// 역할별 기대 범위
const ROLE_EXPECTATIONS = {
  tank: {
    name: '탱커',
    icon: Shield,
    color: '#3b82f6',
    dpsRange: [50, 90],      // 기준의 50-90%
    ehpRange: [180, 250],    // 기준의 180-250%
    description: '높은 생존력, 낮은 화력',
  },
  dps: {
    name: '딜러',
    icon: Swords,
    color: '#ef4444',
    dpsRange: [130, 200],    // 기준의 130-200%
    ehpRange: [60, 90],      // 기준의 60-90%
    description: '높은 화력, 낮은 생존력',
  },
  support: {
    name: '서포터',
    icon: Heart,
    color: '#10b981',
    dpsRange: [40, 70],      // 기준의 40-70%
    ehpRange: [90, 130],     // 기준의 90-130%
    description: '유틸리티 중심, 중간 생존력',
  },
  balanced: {
    name: '밸런스',
    icon: Target,
    color: '#f59e0b',
    dpsRange: [90, 110],     // 기준의 90-110%
    ehpRange: [90, 110],     // 기준의 90-110%
    description: '균형잡힌 스탯',
  },
};

// 기준값 (앵커)
const BASE_STATS = {
  hp: 1000,
  atk: 100,
  def: 50,
  attackSpeed: 1.0,
  critRate: 0.05,
  critDamage: 1.5,
};

interface UnitData {
  name: string;
  role: keyof typeof ROLE_EXPECTATIONS;
  hp: number;
  atk: number;
  def: number;
  attackSpeed: number;
  critRate: number;
  critDamage: number;
}

// DPS 계산
function calculateDPS(unit: UnitData): number {
  const effectiveDamage = unit.atk * (1 + unit.critRate * (unit.critDamage - 1));
  return effectiveDamage * unit.attackSpeed;
}

// EHP 계산
function calculateEHP(unit: UnitData): number {
  return unit.hp * (1 + unit.def / 100);
}

// 기준 DPS/EHP
const BASE_DPS = calculateDPS({
  name: '',
  role: 'balanced',
  ...BASE_STATS,
});

const BASE_EHP = calculateEHP({
  name: '',
  role: 'balanced',
  hp: BASE_STATS.hp,
  atk: BASE_STATS.atk,
  def: BASE_STATS.def,
  attackSpeed: BASE_STATS.attackSpeed,
  critRate: BASE_STATS.critRate,
  critDamage: BASE_STATS.critDamage,
});

// 밸런스 검증
function validateUnit(unit: UnitData) {
  const dps = calculateDPS(unit);
  const ehp = calculateEHP(unit);
  const dpsPercent = (dps / BASE_DPS) * 100;
  const ehpPercent = (ehp / BASE_EHP) * 100;

  const role = ROLE_EXPECTATIONS[unit.role];
  const dpsInRange = dpsPercent >= role.dpsRange[0] && dpsPercent <= role.dpsRange[1];
  const ehpInRange = ehpPercent >= role.ehpRange[0] && ehpPercent <= role.ehpRange[1];

  const issues: string[] = [];
  if (!dpsInRange) {
    if (dpsPercent < role.dpsRange[0]) {
      issues.push(`DPS 부족: ${dpsPercent.toFixed(0)}% (최소 ${role.dpsRange[0]}% 필요)`);
    } else {
      issues.push(`DPS 과다: ${dpsPercent.toFixed(0)}% (최대 ${role.dpsRange[1]}% 권장)`);
    }
  }
  if (!ehpInRange) {
    if (ehpPercent < role.ehpRange[0]) {
      issues.push(`EHP 부족: ${ehpPercent.toFixed(0)}% (최소 ${role.ehpRange[0]}% 필요)`);
    } else {
      issues.push(`EHP 과다: ${ehpPercent.toFixed(0)}% (최대 ${role.ehpRange[1]}% 권장)`);
    }
  }

  // 총 가치 계산 (DPS + EHP 가중 평균)
  const totalValue = (dpsPercent * 0.5 + ehpPercent * 0.5);

  return {
    dps,
    ehp,
    dpsPercent,
    ehpPercent,
    dpsInRange,
    ehpInRange,
    totalValue,
    isBalanced: issues.length === 0,
    issues,
  };
}

// 1:1 시뮬레이션
function simulate1v1(unitA: UnitData, unitB: UnitData): { winner: string; rounds: number; hpRemaining: number } {
  const dpsA = calculateDPS(unitA);
  const dpsB = calculateDPS(unitB);
  const ehpA = calculateEHP(unitA);
  const ehpB = calculateEHP(unitB);

  // 서로에게 주는 실제 데미지 (방어력 감소 적용)
  const dmgAtoB = dpsA * (100 / (100 + unitB.def));
  const dmgBtoA = dpsB * (100 / (100 + unitA.def));

  const timeToKillB = ehpB / dmgAtoB;
  const timeToKillA = ehpA / dmgBtoA;

  if (timeToKillB < timeToKillA) {
    const hpRemaining = unitA.hp - (dmgBtoA * timeToKillB);
    return { winner: unitA.name, rounds: Math.ceil(timeToKillB), hpRemaining: Math.max(0, hpRemaining) };
  } else {
    const hpRemaining = unitB.hp - (dmgAtoB * timeToKillA);
    return { winner: unitB.name, rounds: Math.ceil(timeToKillA), hpRemaining: Math.max(0, hpRemaining) };
  }
}

export default function BalanceValidator({ onClose }: BalanceValidatorProps) {
  const [units, setUnits] = useState<UnitData[]>([
    {
      name: '전사',
      role: 'balanced',
      hp: 1000,
      atk: 100,
      def: 50,
      attackSpeed: 1.0,
      critRate: 0.05,
      critDamage: 1.5,
    },
  ]);
  const [selectedUnits, setSelectedUnits] = useState<[number, number]>([0, 0]);
  const [simResult, setSimResult] = useState<{ winner: string; rounds: number; hpRemaining: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const addUnit = () => {
    setUnits([
      ...units,
      {
        name: `유닛 ${units.length + 1}`,
        role: 'balanced',
        hp: 1000,
        atk: 100,
        def: 50,
        attackSpeed: 1.0,
        critRate: 0.05,
        critDamage: 1.5,
      },
    ]);
  };

  const updateUnit = (index: number, field: keyof UnitData, value: string | number) => {
    const newUnits = [...units];
    if (field === 'name' || field === 'role') {
      newUnits[index] = { ...newUnits[index], [field]: value };
    } else {
      newUnits[index] = { ...newUnits[index], [field]: Number(value) };
    }
    setUnits(newUnits);
  };

  const removeUnit = (index: number) => {
    if (units.length > 1) {
      setUnits(units.filter((_, i) => i !== index));
    }
  };

  const runSimulation = () => {
    if (units.length >= 2 && selectedUnits[0] !== selectedUnits[1]) {
      const result = simulate1v1(units[selectedUnits[0]], units[selectedUnits[1]]);
      setSimResult(result);
    }
  };

  const validations = useMemo(() => units.map(validateUnit), [units]);

  const overallBalance = useMemo(() => {
    const totalValues = validations.map(v => v.totalValue);
    const avg = totalValues.reduce((a, b) => a + b, 0) / totalValues.length;
    const variance = totalValues.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / totalValues.length;
    const stdDev = Math.sqrt(variance);
    return {
      average: avg,
      stdDev,
      isBalanced: stdDev < 15, // 표준편차 15% 이내면 밸런스 양호
    };
  }, [validations]);

  return (
    <div className="card overflow-hidden h-full flex flex-col">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: '#10b981' }}
          >
            <Target className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            밸런스 검증기
          </span>
          <div className="group relative">
            <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-tertiary)' }} />
            <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-72 p-3 rounded-lg text-xs shadow-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
              <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>밸런스 검증기 (유닛 테스터)</div>
              <p className="mb-2">직접 입력한 유닛 스탯이 <strong>역할(탱커/딜러/서포터)에 맞는지</strong> 검증합니다.</p>
              <div className="space-y-1 mb-2">
                <div>- DPS/EHP 계산 및 기대치 비교</div>
                <div>- 역할별 적정 범위 제시</div>
                <div>- 1:1 전투 시뮬레이션</div>
              </div>
              <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                <div><strong>vs 밸런스 분석:</strong> 분석은 시트 기반 전체 패턴, 검증기는 개별 유닛 확인</div>
                <div><strong>vs 전투 시뮬:</strong> 시뮬은 실제 전투, 검증기는 스탯 적합성</div>
              </div>
            </div>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: overallBalance.isBalanced ? 'var(--success-light)' : 'var(--warning-light)',
              color: overallBalance.isBalanced ? 'var(--success)' : 'var(--warning)',
            }}
          >
            {overallBalance.isBalanced ? '양호' : '조정 필요'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: showHelp ? 'var(--accent)' : 'var(--text-tertiary)' }}
            title="사용법 보기"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 pb-12 space-y-3 overflow-y-auto flex-1">
          {/* 기준값 표시 */}
          <div
            className="rounded-lg p-3 text-xs"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              기준값 (100%)
            </div>
            <div className="grid grid-cols-3 gap-2" style={{ color: 'var(--text-secondary)' }}>
              <div>HP: {BASE_STATS.hp}</div>
              <div>ATK: {BASE_STATS.atk}</div>
              <div>DEF: {BASE_STATS.def}</div>
              <div>기준 DPS: {BASE_DPS.toFixed(0)}</div>
              <div>기준 EHP: {BASE_EHP.toFixed(0)}</div>
              <div>공속: {BASE_STATS.attackSpeed}</div>
            </div>
          </div>

          {/* 역할별 기대치 */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ROLE_EXPECTATIONS).map(([key, role]) => {
              const Icon = role.icon;
              return (
                <div
                  key={key}
                  className="rounded-lg p-2 text-xs border"
                  style={{ borderColor: role.color, borderLeftWidth: '3px' }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: role.color }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {role.name}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-tertiary)' }}>
                    DPS: {role.dpsRange[0]}-{role.dpsRange[1]}% | EHP: {role.ehpRange[0]}-{role.ehpRange[1]}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* 유닛 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                유닛 검증
              </h4>
              <button
                onClick={addUnit}
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                + 유닛 추가
              </button>
            </div>

            {units.map((unit, index) => {
              const validation = validations[index];
              const role = ROLE_EXPECTATIONS[unit.role];
              const RoleIcon = role.icon;

              return (
                <div
                  key={index}
                  className="border rounded-lg p-3"
                  style={{
                    borderColor: validation.isBalanced ? 'var(--success)' : 'var(--warning)',
                    background: 'var(--bg-primary)',
                  }}
                >
                  {/* 유닛 기본 정보 */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={unit.name}
                      onChange={(e) => updateUnit(index, 'name', e.target.value)}
                      className="flex-1 px-2 py-1 rounded text-sm font-medium"
                      style={{ background: 'var(--bg-tertiary)' }}
                    />
                    <select
                      value={unit.role}
                      onChange={(e) => updateUnit(index, 'role', e.target.value)}
                      className="px-2 py-1 rounded text-xs"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      {Object.entries(ROLE_EXPECTATIONS).map(([key, r]) => (
                        <option key={key} value={key}>{r.name}</option>
                      ))}
                    </select>
                    <RoleIcon className="w-4 h-4" style={{ color: role.color }} />
                    {units.length > 1 && (
                      <button
                        onClick={() => removeUnit(index)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: 'var(--error)' }}
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {/* 스탯 입력 */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { key: 'hp', label: 'HP' },
                      { key: 'atk', label: 'ATK' },
                      { key: 'def', label: 'DEF' },
                      { key: 'attackSpeed', label: '공속' },
                      { key: 'critRate', label: '크리율' },
                      { key: 'critDamage', label: '크리뎀' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-[10px] block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {label}
                        </label>
                        <input
                          type="number"
                          step={key === 'critRate' ? '0.01' : key === 'attackSpeed' || key === 'critDamage' ? '0.1' : '10'}
                          value={unit[key as keyof UnitData]}
                          onChange={(e) => updateUnit(index, key as keyof UnitData, e.target.value)}
                          className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--bg-tertiary)' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 검증 결과 */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div
                      className={cn('rounded p-2 text-xs')}
                      style={{
                        background: validation.dpsInRange ? 'var(--success-light)' : 'var(--warning-light)',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span className="font-medium">DPS: {validation.dps.toFixed(0)}</span>
                      </div>
                      <div style={{ color: 'var(--text-tertiary)' }}>
                        {validation.dpsPercent.toFixed(0)}% (기대: {role.dpsRange[0]}-{role.dpsRange[1]}%)
                      </div>
                    </div>
                    <div
                      className={cn('rounded p-2 text-xs')}
                      style={{
                        background: validation.ehpInRange ? 'var(--success-light)' : 'var(--warning-light)',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span className="font-medium">EHP: {validation.ehp.toFixed(0)}</span>
                      </div>
                      <div style={{ color: 'var(--text-tertiary)' }}>
                        {validation.ehpPercent.toFixed(0)}% (기대: {role.ehpRange[0]}-{role.ehpRange[1]}%)
                      </div>
                    </div>
                  </div>

                  {/* 경고/성공 메시지 */}
                  {validation.isBalanced ? (
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--success)' }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>역할에 맞는 밸런스</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {validation.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--warning)' }}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 1:1 시뮬레이션 */}
          {units.length >= 2 && (
            <div
              className="rounded-lg p-3 border"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                1:1 시뮬레이션
              </h4>
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={selectedUnits[0]}
                  onChange={(e) => setSelectedUnits([Number(e.target.value), selectedUnits[1]])}
                  className="flex-1 px-2 py-1 rounded text-sm"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  {units.map((u, i) => (
                    <option key={i} value={i}>{u.name}</option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-tertiary)' }}>VS</span>
                <select
                  value={selectedUnits[1]}
                  onChange={(e) => setSelectedUnits([selectedUnits[0], Number(e.target.value)])}
                  className="flex-1 px-2 py-1 rounded text-sm"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  {units.map((u, i) => (
                    <option key={i} value={i}>{u.name}</option>
                  ))}
                </select>
                <button
                  onClick={runSimulation}
                  disabled={selectedUnits[0] === selectedUnits[1]}
                  className="px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
              {simResult && (
                <div
                  className="rounded p-2 text-sm"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    승자: {simResult.winner}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {simResult.rounds}초 후 승리, 잔여 HP: {simResult.hpRemaining.toFixed(0)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 전체 밸런스 요약 */}
          <div
            className="rounded-lg p-3"
            style={{
              background: overallBalance.isBalanced ? 'var(--success-light)' : 'var(--warning-light)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                전체 밸런스
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              평균 가치: {overallBalance.average.toFixed(1)}% |
              표준편차: {overallBalance.stdDev.toFixed(1)}%
              {overallBalance.isBalanced ? ' (양호)' : ' (조정 필요)'}
            </div>
          </div>

          {/* 도움말 */}
          {showHelp && (
            <div
              className="rounded-lg p-4 border space-y-4 animate-fadeIn"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent)' }}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  밸런스 검증기 사용법
                </span>
              </div>

              {/* 개요 */}
              <div className="space-y-1">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>개요</div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  밸런스 검증기는 게임 캐릭터/유닛의 DPS(초당 데미지)와 EHP(유효 체력)를 분석하여
                  역할에 맞는 밸런스를 갖추고 있는지 검증합니다.
                </p>
              </div>

              {/* 사용 방법 */}
              <div className="space-y-2">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>사용 방법</div>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>1</span>
                    <span><strong>유닛 추가:</strong> "유닛 추가" 버튼으로 비교할 캐릭터를 추가합니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>2</span>
                    <span><strong>역할 설정:</strong> 탱커/딜러/서포터/밸런스 중 해당 역할을 선택합니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>3</span>
                    <span><strong>스탯 입력:</strong> HP, ATK, DEF, 공속, 크리율, 크리뎀을 입력합니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>4</span>
                    <span><strong>결과 확인:</strong> DPS/EHP가 역할 기대치 범위에 있는지 확인합니다.</span>
                  </div>
                </div>
              </div>

              {/* 역할별 기대치 설명 */}
              <div className="space-y-2">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>역할별 특성</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Shield className="w-3 h-3" style={{ color: '#3b82f6' }} />
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>탱커</span>
                    </div>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      EHP 180-250%, DPS 50-90%<br/>
                      높은 생존력으로 적의 공격을 흡수
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Swords className="w-3 h-3" style={{ color: '#ef4444' }} />
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>딜러</span>
                    </div>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      DPS 130-200%, EHP 60-90%<br/>
                      높은 화력으로 적을 빠르게 제거
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Heart className="w-3 h-3" style={{ color: '#10b981' }} />
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>서포터</span>
                    </div>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      DPS 40-70%, EHP 90-130%<br/>
                      유틸리티 스킬로 팀 보조
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="w-3 h-3" style={{ color: '#f59e0b' }} />
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>밸런스</span>
                    </div>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      DPS 90-110%, EHP 90-110%<br/>
                      균형잡힌 올라운더 타입
                    </div>
                  </div>
                </div>
              </div>

              {/* 1:1 시뮬레이션 설명 */}
              <div className="space-y-1">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>1:1 시뮬레이션</div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  두 유닛을 선택하고 ▶ 버튼을 누르면 1:1 전투를 시뮬레이션합니다.
                  승자, 전투 시간, 잔여 HP를 확인하여 상성 관계를 파악할 수 있습니다.
                </p>
              </div>

              {/* 팁 */}
              <div className="space-y-1">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>밸런싱 팁</div>
                <ul className="text-xs space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <li>• 같은 역할의 유닛은 DPS/EHP가 유사해야 합니다</li>
                  <li>• 탱커 vs 딜러는 승률 50% 근처가 이상적입니다</li>
                  <li>• 총 가치 = (DPS% + EHP%) / 2가 비슷하면 밸런스 양호</li>
                  <li>• 표준편차 15% 이하면 전체적으로 균형잡힌 밸런스입니다</li>
                </ul>
              </div>
            </div>
          )}

          {/* 간단 도움말 (접힌 상태) */}
          {!showHelp && (
            <div
              className="rounded-lg p-3 text-xs border cursor-pointer hover:border-opacity-70 transition-colors"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
              onClick={() => setShowHelp(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>도움말 보기 (사용법, 역할별 특성, 팁)</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
