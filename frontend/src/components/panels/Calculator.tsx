'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Calculator as CalcIcon, Crosshair, Zap, Shield, TrendingUp, Download, HelpCircle, ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { DPS, TTK, EHP, DAMAGE, SCALE } from '@/lib/formulaEngine';
import { useProjectStore } from '@/stores/projectStore';
import { Tooltip } from '@/components/ui/Tooltip';

// 행 표시명 생성 헬퍼
function getRowDisplayName(rowId: string, currentSheet: { name: string; rows: { id: string }[] } | undefined, t: any): string {
  if (!currentSheet) return t('sheet.rows');
  const rowIndex = currentSheet.rows.findIndex(r => r.id === rowId);
  return `${currentSheet.name} - ${t('comparison.rowNum', { num: rowIndex + 1 })}`;
}

interface CalculatorProps {
  onClose: () => void;
  isPanel?: boolean;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

type CalculatorTab = 'dps' | 'ttk' | 'ehp' | 'damage' | 'scale';

// 각 탭별 도움말 정보 - 이 함수는 컴포넌트 내부로 이동할 것
const getTabHelp = (t: any) => ({
  dps: {
    title: t('dps.title'),
    description: t('dps.desc'),
    formula: t('dps.formula'),
    terms: [
      { name: t('dps.damage'), desc: t('dps.damageDesc') },
      { name: t('dps.attackSpeed'), desc: t('dps.attackSpeedDesc') },
      { name: t('dps.critRate'), desc: t('dps.critRateDesc') },
      { name: t('dps.critDamage'), desc: t('dps.critDamageDesc') },
    ],
    example: t('dps.example'),
    useCase: t('dps.useCase'),
  },
  ttk: {
    title: t('ttk.title'),
    description: t('ttk.desc'),
    formula: t('ttk.formula'),
    terms: [
      { name: t('ttk.targetHp'), desc: t('ttk.targetHpDesc') },
      { name: t('ttk.damage'), desc: t('ttk.damageDesc') },
      { name: t('ttk.attackSpeed'), desc: t('ttk.attackSpeedDesc') },
    ],
    example: t('ttk.example'),
    useCase: t('ttk.useCase'),
  },
  ehp: {
    title: t('ehp.title'),
    description: t('ehp.desc'),
    formula: t('ehp.formula'),
    terms: [
      { name: t('ehp.hp'), desc: t('ehp.hpDesc') },
      { name: t('ehp.def'), desc: t('ehp.defDesc') },
      { name: t('ehp.reduction'), desc: t('ehp.reductionDesc') },
    ],
    example: t('ehp.example'),
    useCase: t('ehp.useCase'),
  },
  damage: {
    title: t('damageCalc.title'),
    description: t('damageCalc.desc'),
    formula: t('damageCalc.formula'),
    terms: [
      { name: t('damageCalc.atk'), desc: t('damageCalc.atkDesc') },
      { name: t('damageCalc.def'), desc: t('damageCalc.defDesc') },
      { name: t('damageCalc.multiplier'), desc: t('damageCalc.multiplierDesc') },
    ],
    example: t('damageCalc.example'),
    useCase: t('damageCalc.useCase'),
  },
  scale: {
    title: t('scale.title'),
    description: t('scale.desc'),
    formula: t('scale.formula'),
    terms: [
      { name: t('scale.base'), desc: t('scale.baseDesc') },
      { name: t('scale.level'), desc: t('scale.levelDesc') },
      { name: t('scale.rate'), desc: t('scale.rateDesc') },
      { name: t('scale.curveType'), desc: t('scale.curveTypeDesc') },
    ],
    example: t('scale.example'),
    useCase: t('scale.useCase'),
  },
});

// 곡선 타입별 상세 설명 - 이 함수는 컴포넌트 내부로 이동할 것
const getCurveTypeHelp = (t: any): Record<string, { name: string; formula: string; description: string; useCase: string }> => ({
  linear: {
    name: t('curveHelp.linear.name'),
    formula: t('curveHelp.linear.formula'),
    description: t('curveHelp.linear.desc'),
    useCase: t('curveHelp.linear.useCase'),
  },
  exponential: {
    name: t('curveHelp.exponential.name'),
    formula: t('curveHelp.exponential.formula'),
    description: t('curveHelp.exponential.desc'),
    useCase: t('curveHelp.exponential.useCase'),
  },
  logarithmic: {
    name: t('curveHelp.logarithmic.name'),
    formula: t('curveHelp.logarithmic.formula'),
    description: t('curveHelp.logarithmic.desc'),
    useCase: t('curveHelp.logarithmic.useCase'),
  },
  quadratic: {
    name: t('curveHelp.quadratic.name'),
    formula: t('curveHelp.quadratic.formula'),
    description: t('curveHelp.quadratic.desc'),
    useCase: t('curveHelp.quadratic.useCase'),
  },
});

export default function Calculator({ onClose, isPanel = false, showHelp = false, setShowHelp }: CalculatorProps) {
  const t = useTranslations('calculator');
  const [activeTab, setActiveTab] = useState<CalculatorTab>('dps');
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const { selectedRows, clearSelectedRows, deselectRow, projects, currentProjectId, currentSheetId } = useProjectStore();

  // 현재 시트 가져오기
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  // 탭 도움말 및 곡선 타입 도움말
  const TAB_HELP = useMemo(() => getTabHelp(t), [t]);
  const CURVE_TYPE_HELP = useMemo(() => getCurveTypeHelp(t), [t]);

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
    { id: 'dps' as const, name: 'DPS', icon: Zap, tooltip: t('tabTooltip.dps') },
    { id: 'ttk' as const, name: 'TTK', icon: Crosshair, tooltip: t('tabTooltip.ttk') },
    { id: 'ehp' as const, name: 'EHP', icon: Shield, tooltip: t('tabTooltip.ehp') },
    { id: 'damage' as const, name: 'DAMAGE', icon: CalcIcon, tooltip: t('tabTooltip.damage') },
    { id: 'scale' as const, name: 'SCALE', icon: TrendingUp, tooltip: t('tabTooltip.scale') },
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

  // 공통 wrapper 클래스
  const wrapperClass = isPanel
    ? "flex flex-col h-full"
    : "fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-2 sm:p-4";

  const cardClass = isPanel
    ? "flex flex-col h-full"
    : "card w-full max-w-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col animate-fadeIn";

  // 모달/패널 공통
  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        {/* 헤더 - 모달일 때만 표시 */}
        {!isPanel && (
          <div
            className="flex items-center justify-between shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-xl flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10" style={{ background: '#8b5cf6' }}>
                <CalcIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('fullTitle')}
                </h2>
                <p className="text-xs sm:text-sm hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg transition-colors p-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 수식 선택 드롭다운 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="relative flex-1">
            <button
              onClick={() => setShowTabDropdown(!showTabDropdown)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)'
              }}
            >
              {(() => {
                const currentTab = tabs.find(t => t.id === activeTab);
                const Icon = currentTab?.icon || Zap;
                return (
                  <>
                    <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span className="text-sm font-medium flex-1">{currentTab?.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{currentTab?.tooltip}</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 ml-1", showTabDropdown && "rotate-180")} style={{ color: 'var(--text-tertiary)' }} />
                  </>
                );
              })()}
            </button>
            {showTabDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTabDropdown(false)} />
                <div
                  className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-lg z-50 overflow-hidden"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <div className="p-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setShowTabDropdown(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                            isActive ? "bg-[var(--accent-light)]" : "hover:bg-[var(--bg-hover)]"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                          <span className="text-sm font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {tab.name}
                          </span>
                          <span className="text-xs flex-1 text-right" style={{ color: 'var(--text-tertiary)' }}>
                            {tab.tooltip}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          {!isPanel && setShowHelp && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all shrink-0"
              style={{
                background: showHelp ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: showHelp ? 'white' : 'var(--text-secondary)'
              }}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 현재 탭 도움말 (모달 모드) - 공식 중심 */}
        {!isPanel && showHelp && (
          <div className="px-6 py-4 border-b animate-fadeIn" style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)'
          }}>
            {/* 공식 먼저 표시 */}
            <div className="p-3 rounded-lg mb-3" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid var(--accent)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('formula')}</div>
              <code className="text-sm font-mono font-medium" style={{ color: 'var(--accent)' }}>
                {TAB_HELP[activeTab].formula}
              </code>
            </div>

            {/* 변수 설명 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {TAB_HELP[activeTab].terms.map((term, i) => (
                <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{term.name}</span>
                  <span className="mx-1">:</span>
                  <span>{term.desc}</span>
                </div>
              ))}
            </div>

            {/* 예시 */}
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {t('example')}: {TAB_HELP[activeTab].example}
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
                <span className="font-medium">{t('selectedData')} ({selectedRows.length}개)</span>
              </div>
              <button
                onClick={clearSelectedRows}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--accent-text)' }}
              >
                {t('deselectAll')}
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
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{getRowDisplayName(row.rowId, currentSheet, t)}</span>
                  <button
                    onClick={() => loadFromSelectedRow(row)}
                    className="px-2 py-0.5 rounded text-xs transition-colors"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    {t('load')}
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {/* 패널 모드 도움말 */}
          {isPanel && showHelp && (
            <div className="mb-6 p-3 rounded-lg animate-slideDown" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
              <div className="font-medium mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</div>
              <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-start gap-2">
                  <span className="font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>DPS</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Damage Per Second (초당 피해량)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>TTK</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Time To Kill (처치까지 걸리는 시간)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>EHP</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Effective HP (유효 체력, 방어력 포함)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>DAMAGE</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>실제 피해량 (방어력 적용 후)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>SCALE</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>레벨별 스탯 성장 계산</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                {t('helpTip')}
              </div>
            </div>
          )}

          {/* DPS 계산기 */}
          {activeTab === 'dps' && (
            <div className="space-y-6">
              {/* 탭 설명 헤더 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--accent)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{TAB_HELP.dps.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{TAB_HELP.dps.description}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('useCase')}: {TAB_HELP.dps.useCase}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label={t('damage1hit')}
                  value={dpsInputs.damage}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, damage: v })}
                />
                <InputField
                  label={t('attackSpeed')}
                  value={dpsInputs.attackSpeed}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, attackSpeed: v })}
                  step={0.1}
                />
                <InputField
                  label={t('critRate')}
                  value={dpsInputs.critRate}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, critRate: v })}
                  step={0.01}
                  min={0}
                  max={1}
                />
                <InputField
                  label={t('critMultiplier')}
                  value={dpsInputs.critDamage}
                  onChange={(v) => setDpsInputs({ ...dpsInputs, critDamage: v })}
                  step={0.1}
                />
              </div>

              <ResultCard
                label={t('dpsResult')}
                value={dpsResult.toFixed(2)}
                color="var(--accent)"
                extra={`${t('baseDps')}: ${(dpsInputs.damage * dpsInputs.attackSpeed).toFixed(2)} | ${t('critBonus')}: +${((dpsResult / (dpsInputs.damage * dpsInputs.attackSpeed) - 1) * 100).toFixed(1)}%`}
              />

              {/* 공식 */}
              <FormulaBox
                formula="damage × (1 + critRate × (critDamage - 1)) × attackSpeed"
                hint={t('dpsFormulaHint')}
              />
            </div>
          )}

          {/* TTK 계산기 */}
          {activeTab === 'ttk' && (
            <div className="space-y-6">
              {/* 탭 설명 헤더 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--error)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{TAB_HELP.ttk.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{TAB_HELP.ttk.description}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('useCase')}: {TAB_HELP.ttk.useCase}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label={t('targetHp')}
                  value={ttkInputs.targetHP}
                  onChange={(v) => setTtkInputs({ ...ttkInputs, targetHP: v })}
                />
                <InputField
                  label={t('damage1')}
                  value={ttkInputs.damage}
                  onChange={(v) => setTtkInputs({ ...ttkInputs, damage: v })}
                />
                <InputField
                  label={t('attackSpeed')}
                  value={ttkInputs.attackSpeed}
                  onChange={(v) => setTtkInputs({ ...ttkInputs, attackSpeed: v })}
                  step={0.1}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ResultCard
                  label={t('ttkResult')}
                  value={ttkResult.ttk === Infinity ? '∞' : `${ttkResult.ttk.toFixed(2)}초`}
                  color="var(--error)"
                />
                <ResultCard
                  label={t('hitsRequired')}
                  value={`${ttkResult.hitsNeeded}회`}
                  color="var(--warning)"
                />
              </div>

              {/* 공식 */}
              <FormulaBox
                formula="(ceil(targetHP / damage) - 1) / attackSpeed"
                hint={t('ttkFormulaHint')}
              />
            </div>
          )}

          {/* EHP 계산기 */}
          {activeTab === 'ehp' && (
            <div className="space-y-6">
              {/* 탭 설명 헤더 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--accent)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{TAB_HELP.ehp.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{TAB_HELP.ehp.description}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('useCase')}: {TAB_HELP.ehp.useCase}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label={t('hp')}
                  value={ehpInputs.hp}
                  onChange={(v) => setEhpInputs({ ...ehpInputs, hp: v })}
                />
                <InputField
                  label={t('def')}
                  value={ehpInputs.def}
                  onChange={(v) => setEhpInputs({ ...ehpInputs, def: v })}
                />
                <InputField
                  label={t('damageReduction')}
                  value={ehpInputs.damageReduction}
                  onChange={(v) => setEhpInputs({ ...ehpInputs, damageReduction: v })}
                  step={0.01}
                  min={0}
                  max={0.99}
                />
              </div>

              <ResultCard
                label={t('ehpResult')}
                value={ehpResult.toFixed(0)}
                color="var(--accent)"
                extra={`${t('vsOriginal')} ${((ehpResult / ehpInputs.hp) * 100).toFixed(1)}% (×${(ehpResult / ehpInputs.hp).toFixed(2)})`}
              />

              {/* 공식 */}
              <FormulaBox
                formula="hp × (1 + def/100) × (1 / (1 - damageReduction))"
                hint={t('ehpFormulaHint')}
              />
            </div>
          )}

          {/* DAMAGE 계산기 */}
          {activeTab === 'damage' && (
            <div className="space-y-6">
              {/* 탭 설명 헤더 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--warning)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{TAB_HELP.damage.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{TAB_HELP.damage.description}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('useCase')}: {TAB_HELP.damage.useCase}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label={t('atk')}
                  value={damageInputs.atk}
                  onChange={(v) => setDamageInputs({ ...damageInputs, atk: v })}
                />
                <InputField
                  label={t('def')}
                  value={damageInputs.def}
                  onChange={(v) => setDamageInputs({ ...damageInputs, def: v })}
                />
                <InputField
                  label={t('skillMultiplier')}
                  value={damageInputs.multiplier}
                  onChange={(v) => setDamageInputs({ ...damageInputs, multiplier: v })}
                  step={0.1}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ResultCard
                  label={t('finalDamage')}
                  value={damageResult.toFixed(1)}
                  color="var(--warning)"
                />
                <ResultCard
                  label={t('damageReductionRate')}
                  value={`${((1 - 100 / (100 + damageInputs.def)) * 100).toFixed(1)}%`}
                  color="var(--text-secondary)"
                />
              </div>

              {/* 공식 */}
              <FormulaBox
                formula="atk × (100 / (100 + def)) × multiplier"
                hint={t('damageFormulaHint')}
              />
            </div>
          )}

          {/* SCALE 계산기 */}
          {activeTab === 'scale' && (
            <div className="space-y-6">
              {/* 탭 설명 헤더 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--success)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{TAB_HELP.scale.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{TAB_HELP.scale.description}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('useCase')}: {TAB_HELP.scale.useCase}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label={t('baseValue')}
                  value={scaleInputs.base}
                  onChange={(v) => setScaleInputs({ ...scaleInputs, base: v })}
                />
                <InputField
                  label={t('level')}
                  value={scaleInputs.level}
                  onChange={(v) => setScaleInputs({ ...scaleInputs, level: v })}
                />
                <InputField
                  label={t('growthRate')}
                  value={scaleInputs.rate}
                  onChange={(v) => setScaleInputs({ ...scaleInputs, rate: v })}
                  step={0.01}
                />
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {t('curveType')}
                  </label>
                  <select
                    value={scaleInputs.curveType}
                    onChange={(e) => setScaleInputs({ ...scaleInputs, curveType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg"
                  >
                    <option value="linear">{t('curveLinear')}</option>
                    <option value="exponential">{t('curveExponential')}</option>
                    <option value="logarithmic">{t('curveLogarithmic')}</option>
                    <option value="quadratic">{t('curveQuadratic')}</option>
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
                label={t('levelStat', { level: scaleInputs.level })}
                value={scaleResult.toFixed(1)}
                color="var(--success)"
              />

              {/* 간단한 레벨별 표 */}
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--bg-tertiary)' }}>
                    <tr>
                      <th className="px-3 py-2 text-left" style={{ color: 'var(--text-secondary)' }}>{t('level')}</th>
                      {scaleData.slice(0, 8).map((d) => (
                        <th key={d.level} className="px-3 py-2 text-right" style={{ color: 'var(--text-secondary)' }}>{d.level}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{t('value')}</td>
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
  const [inputValue, setInputValue] = useState(String(value));
  const [isHovered, setIsHovered] = useState(false);
  const { startCellSelection, cellSelectionMode } = useProjectStore();

  // 외부 value 변경 시 inputValue 동기화
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleCellSelect = () => {
    startCellSelection(label, (cellValue) => {
      setInputValue(String(cellValue));
      onChange(cellValue);
    });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            // 숫자, 소수점, 마이너스만 허용
            if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
              setInputValue(newValue);
              const num = parseFloat(newValue);
              if (!isNaN(num)) {
                onChange(num);
              }
            }
          }}
          onBlur={() => {
            // 포커스 벗어나면 숫자로 정규화
            const num = parseFloat(inputValue);
            if (isNaN(num) || inputValue === '') {
              setInputValue(String(min ?? 0));
              onChange(min ?? 0);
            } else {
              setInputValue(String(num));
            }
          }}
          className="w-full px-3 py-2 pr-9 rounded-lg"
        />
        {/* 셀 선택 버튼 - 호버 시 표시 */}
        {isHovered && !cellSelectionMode.active && (
          <Tooltip content="셀에서 값 가져오기" position="top">
            <button
              onClick={handleCellSelect}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
            >
              <Grid3X3 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </Tooltip>
        )}
      </div>
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

function FormulaBox({
  formula,
  hint,
}: {
  formula: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-lg p-3 border-l-3"
      style={{
        background: 'var(--bg-secondary)',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>공식</div>
      <code className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
        {formula}
      </code>
      {hint && (
        <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
