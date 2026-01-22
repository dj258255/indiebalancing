'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Calculator as CalcIcon, Crosshair, Zap, Shield, TrendingUp, Download, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { DPS, TTK, EHP, DAMAGE, SCALE } from '@/lib/formulaEngine';
import { useProjectStore } from '@/stores/projectStore';

// 행 표시명 생성 헬퍼
function getRowDisplayName(rowId: string, currentSheet: { name: string; rows: { id: string }[] } | undefined, t: any): string {
  if (!currentSheet) return t('sheet.rows');
  const rowIndex = currentSheet.rows.findIndex(r => r.id === rowId);
  return `${currentSheet.name} - ${rowIndex + 1}${t('sheet.rows')}`;
}

interface CalculatorProps {
  onClose: () => void;
  isPanel?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
}

type CalculatorTab = 'dps' | 'ttk' | 'ehp' | 'damage' | 'scale';

// 각 탭별 도움말 정보 - 이 함수는 컴포넌트 내부로 이동할 것
const getTabHelp = (t: any) => ({
  dps: {
    title: t('dps.title'),
    description: t('dps.desc'),
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

export default function Calculator({ onClose, isPanel = false, onDragStart }: CalculatorProps) {
  const t = useTranslations('calculator');
  const [activeTab, setActiveTab] = useState<CalculatorTab>('dps');
  const [showHelp, setShowHelp] = useState(false);
  const [helpHeight, setHelpHeight] = useState(120);
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

  // 공통 wrapper 클래스
  const wrapperClass = isPanel
    ? "flex flex-col h-full"
    : "fixed inset-0 modal-overlay flex items-center justify-center z-50 p-2 sm:p-4";

  const cardClass = isPanel
    ? "flex flex-col h-full"
    : "card w-full max-w-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col animate-fadeIn";

  // 모달/패널 공통
  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        {/* 헤더 */}
        <div
          className={`flex items-center justify-between shrink-0 ${isPanel ? 'px-4 py-3 relative z-20 cursor-grab active:cursor-grabbing' : 'px-4 sm:px-6 py-3 sm:py-4 border-b'}`}
          style={{ background: isPanel ? '#8b5cf615' : undefined, borderColor: isPanel ? '#8b5cf640' : 'var(--border-primary)', borderBottom: isPanel ? '1px solid #8b5cf640' : undefined }}
          onMouseDown={(e) => {
            if (isPanel && !(e.target as HTMLElement).closest('button') && onDragStart) {
              onDragStart(e);
            }
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`rounded-xl flex items-center justify-center ${isPanel ? 'w-8 h-8' : 'w-8 h-8 sm:w-10 sm:h-10'}`} style={{ background: '#8b5cf6' }}>
              <CalcIcon className={isPanel ? 'w-4 h-4 text-white' : 'w-4 h-4 sm:w-5 sm:h-5 text-white'} />
            </div>
            <div>
              <h2 className={isPanel ? 'text-base font-semibold' : 'text-base sm:text-lg font-semibold'} style={{ color: isPanel ? '#8b5cf6' : 'var(--text-primary)' }}>
                {isPanel ? t('title') : t('fullTitle')}
              </h2>
              {!isPanel && <p className="text-xs sm:text-sm hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>{t('subtitle')}</p>}
            </div>
            {isPanel && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`p-1 rounded-lg transition-colors ${showHelp ? 'bg-[#8b5cf6]/20' : 'hover:bg-[var(--bg-hover)]'}`}
                style={{ border: showHelp ? '1px solid #8b5cf6' : '1px solid var(--border-secondary)' }}
              >
                <HelpCircle className="w-4 h-4" style={{ color: showHelp ? '#8b5cf6' : 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg transition-colors ${isPanel ? 'p-1.5 hover:bg-black/5 dark:hover:bg-white/5' : 'p-2'}`}
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className={isPanel ? 'w-4 h-4' : 'w-5 h-5'} />
          </button>
        </div>

        {/* 패널 모드 헤더 도움말 - 탭 위에 표시 */}
        {isPanel && showHelp && (
          <div className="shrink-0 animate-slideDown flex flex-col" style={{ height: `${helpHeight + 6}px`, minHeight: '66px', maxHeight: '306px', borderBottom: '1px solid var(--border-primary)' }}>
            <div
              className="flex-1 px-4 py-3 text-sm overflow-y-auto"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</div>
              <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>{t('helpDesc')}</p>
              <div className="space-y-1 mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div>{t('helpDps')}</div>
                <div>{t('helpEhp')}</div>
              </div>
              <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                {t('helpTip')}
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
          {!isPanel && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-colors shrink-0"
              style={{
                background: showHelp ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                color: showHelp ? 'var(--accent-text)' : 'var(--text-secondary)'
              }}
              title="도움말"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 현재 탭 도움말 (모달 모드) */}
        {!isPanel && showHelp && (
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* DPS 계산기 */}
          {activeTab === 'dps' && (
            <div className="space-y-6">
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

  // 외부 value 변경 시 inputValue 동기화
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
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
