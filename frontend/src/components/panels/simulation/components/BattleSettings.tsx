/**
 * BattleSettings - 전투 설정 패널 컴포넌트
 */

'use client';

import type { Sheet } from '@/types';
import type { BattleConfig, DefenseFormulaType, ArmorPenetrationConfig } from '@/lib/simulation/types';
import type { ColumnMapping } from '../hooks';
import { useTranslations } from 'next-intl';

interface BattleSettingsProps {
  runs: number;
  setRuns: (value: number) => void;
  damageFormula: BattleConfig['damageFormula'];
  setDamageFormula: (value: BattleConfig['damageFormula']) => void;
  defenseFormula: DefenseFormulaType;
  setDefenseFormula: (value: DefenseFormulaType) => void;
  maxDuration: number;
  setMaxDuration: (value: number) => void;
  useArmorPen: boolean;
  setUseArmorPen: (value: boolean) => void;
  armorPen: ArmorPenetrationConfig;
  setArmorPen: (value: ArmorPenetrationConfig) => void;
  columnMapping: ColumnMapping;
  setColumnMapping: (value: ColumnMapping) => void;
  autoDetectedColumns: ColumnMapping;
  currentSheet: Sheet | undefined;
}

export function BattleSettings({
  runs,
  setRuns,
  damageFormula,
  setDamageFormula,
  defenseFormula,
  setDefenseFormula,
  maxDuration,
  setMaxDuration,
  useArmorPen,
  setUseArmorPen,
  armorPen,
  setArmorPen,
  columnMapping,
  setColumnMapping,
  autoDetectedColumns,
  currentSheet,
}: BattleSettingsProps) {
  const t = useTranslations('simulation');

  return (
    <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {t('settings')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('runs')}
          </label>
          <select
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded text-sm"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value={1000}>{t('iterations.1000')}</option>
            <option value={5000}>{t('iterations.5000')}</option>
            <option value={10000}>{t('iterations.10000')}</option>
            <option value={50000}>{t('iterations.50000')}</option>
            <option value={100000}>{t('iterations.100000')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('damageFormula')}
          </label>
          <select
            value={damageFormula}
            onChange={(e) => setDamageFormula(e.target.value as BattleConfig['damageFormula'])}
            className="w-full px-2 py-1.5 rounded text-sm"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="simple">{t('formulas.simple')}</option>
            <option value="mmorpg">{t('formulas.mmorpg')}</option>
            <option value="percentage">{t('formulas.percentage')}</option>
            <option value="random">{t('formulas.random')}</option>
            <option value="multiplicative">{t('formulas.multiplicative')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('defenseFormula')}
          </label>
          <select
            value={defenseFormula}
            onChange={(e) => setDefenseFormula(e.target.value as DefenseFormulaType)}
            className="w-full px-2 py-1.5 rounded text-sm"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="subtractive">{t('defFormulas.subtractive')}</option>
            <option value="divisive">{t('defFormulas.divisive')}</option>
            <option value="multiplicative">{t('defFormulas.multiplicative')}</option>
            <option value="logarithmic">{t('defFormulas.logarithmic')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('maxBattleTime')}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={maxDuration}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*$/.test(v)) {
                setMaxDuration(Number(v) || 0);
              }
            }}
            className="w-full px-2 py-1.5 rounded text-sm"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* 방어관통 설정 */}
      <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={useArmorPen}
            onChange={(e) => setUseArmorPen(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('useArmorPen')}
          </span>
        </label>

        {useArmorPen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('flatPen')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={armorPen.flatPenetration || 0}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || /^\d*$/.test(v)) {
                    setArmorPen({ ...armorPen, flatPenetration: Number(v) || 0 });
                  }
                }}
                className="w-full px-2 py-1 rounded text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('percentPen')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={armorPen.percentPenetration || 0}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || /^\d*\.?\d*$/.test(v)) {
                    setArmorPen({ ...armorPen, percentPenetration: Number(v) || 0 });
                  }
                }}
                className="w-full px-2 py-1 rounded text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 컬럼 매핑 설정 */}
      {currentSheet && (
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('columnMapping')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                { key: 'name' as const, label: t('colName') },
                { key: 'hp' as const, label: 'HP' },
                { key: 'atk' as const, label: 'ATK' },
                { key: 'def' as const, label: 'DEF' },
                { key: 'speed' as const, label: 'Speed' },
                { key: 'critRate' as const, label: t('colCritRate') },
                { key: 'critDamage' as const, label: t('colCritDmg') },
              ] as const
            ).map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </label>
                <select
                  value={columnMapping[key]}
                  onChange={(e) => setColumnMapping({ ...columnMapping, [key]: e.target.value })}
                  className="w-full px-2 py-1 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">{t('autoDetect')}</option>
                  {currentSheet.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                      {autoDetectedColumns[key] === col.id ? ` (${t('detected')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
