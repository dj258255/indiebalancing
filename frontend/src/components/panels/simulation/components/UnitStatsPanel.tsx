/**
 * UnitStatsPanel - 1v1 유닛 스탯 입력 패널
 */

'use client';

import { Heart, Swords, Shield, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import type { UnitStats, Skill } from '@/lib/simulation/types';
import { StatInput } from './StatInput';
import { UnitPicker } from './UnitPicker';
import { SkillEditor } from './SkillEditor';
import { useTranslations } from 'next-intl';

interface UnitStatsPanelProps {
  unitStats: UnitStats;
  setUnitStats: (fn: (prev: UnitStats) => UnitStats) => void;
  skills: Skill[];
  setSkills: (skills: Skill[]) => void;
  showSkills: boolean;
  setShowSkills: (show: boolean) => void;
  units: UnitStats[];
  onLoadFromSheet: (unit: UnitStats) => void;
  startCellSelection: (label: string, callback: (value: string | number | boolean | null) => void) => void;
  color: string;
  placeholder: string;
}

export function UnitStatsPanel({
  unitStats,
  setUnitStats,
  skills,
  setSkills,
  showSkills,
  setShowSkills,
  units,
  onLoadFromSheet,
  startCellSelection,
  color,
  placeholder,
}: UnitStatsPanelProps) {
  const t = useTranslations('simulation');

  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: `2px solid ${color}` }}>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={unitStats.name}
          onChange={(e) => setUnitStats(prev => ({ ...prev, name: e.target.value }))}
          className="text-sm font-medium bg-transparent border-none outline-none flex-1 min-w-0"
          style={{ color }}
          placeholder={placeholder}
        />
        <UnitPicker
          units={units}
          onSelect={onLoadFromSheet}
          color={color}
          buttonText={t('loadFromSheet')}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
        <StatInput
          icon={Heart}
          label="HP"
          value={unitStats.maxHp}
          onChange={(v) => setUnitStats(prev => ({ ...prev, maxHp: v, hp: v }))}
          onCellSelect={() => startCellSelection(`HP (${unitStats.name})`, (value) => {
            const num = Number(value);
            if (!isNaN(num)) setUnitStats(prev => ({ ...prev, maxHp: num, hp: num }));
          })}
          color="#e86161"
        />
        <StatInput
          icon={Swords}
          label="ATK"
          value={unitStats.atk}
          onChange={(v) => setUnitStats(prev => ({ ...prev, atk: v }))}
          onCellSelect={() => startCellSelection(`ATK (${unitStats.name})`, (value) => {
            const num = Number(value);
            if (!isNaN(num)) setUnitStats(prev => ({ ...prev, atk: num }));
          })}
          color="#e5a440"
        />
        <StatInput
          icon={Shield}
          label="DEF"
          value={unitStats.def}
          onChange={(v) => setUnitStats(prev => ({ ...prev, def: v }))}
          onCellSelect={() => startCellSelection(`DEF (${unitStats.name})`, (value) => {
            const num = Number(value);
            if (!isNaN(num)) setUnitStats(prev => ({ ...prev, def: num }));
          })}
          color="#5a9cf5"
        />
        <StatInput
          icon={Zap}
          label="SPD"
          value={unitStats.speed}
          onChange={(v) => setUnitStats(prev => ({ ...prev, speed: v }))}
          onCellSelect={() => startCellSelection(`SPD (${unitStats.name})`, (value) => {
            const num = Number(value);
            if (!isNaN(num)) setUnitStats(prev => ({ ...prev, speed: num }));
          })}
          color="#9179f2"
        />
      </div>
      {/* 스킬 섹션 */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <button
          onClick={() => setShowSkills(!showSkills)}
          className="w-full flex items-center justify-between text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="flex items-center gap-2">
            {t('skills')}
            {skills.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-sm" style={{ background: `${color}20`, color }}>
                {skills.length}
              </span>
            )}
          </span>
          {showSkills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showSkills && (
          <div className="mt-2">
            <SkillEditor
              skills={skills}
              onSkillsChange={setSkills}
              color={color}
            />
          </div>
        )}
      </div>
    </div>
  );
}
