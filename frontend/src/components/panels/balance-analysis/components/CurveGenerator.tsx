/**
 * CurveGenerator - 밸런스 커브 생성기 컴포넌트
 */

'use client';

import { useState, useEffect } from 'react';
import { Target, Grid3X3 } from 'lucide-react';
import { generateBalanceCurve } from '@/lib/balanceAnalysis';
import { useProjectStore } from '@/stores/projectStore';
import { Tooltip } from '@/components/ui/Tooltip';

const PANEL_COLOR = '#9179f2';

// 셀 선택 가능한 입력 필드
function StatInputField({
  label,
  value,
  onChange,
  step = 1
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const [inputValue, setInputValue] = useState(String(value));
  const [isHovered, setIsHovered] = useState(false);
  const { startCellSelection, cellSelectionMode } = useProjectStore();

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
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
              setInputValue(newValue);
              const num = parseFloat(newValue);
              if (!isNaN(num)) onChange(num);
            }
          }}
          onBlur={() => {
            const num = parseFloat(inputValue);
            if (isNaN(num) || inputValue === '') {
              setInputValue('0');
              onChange(0);
            } else {
              setInputValue(String(num));
            }
          }}
          className="glass-input w-full pr-9 text-sm"
        />
        {isHovered && !cellSelectionMode.active && (
          <Tooltip content="셀에서 선택" position="top">
            <button
              onClick={handleCellSelect}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Grid3X3 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export function CurveGenerator() {
  const [baseHp, setBaseHp] = useState(100);
  const [baseAtk, setBaseAtk] = useState(10);
  const [baseDef, setBaseDef] = useState(5);
  const [baseSpeed, setBaseSpeed] = useState(1);
  const [maxLevel, setMaxLevel] = useState(10);
  const [growthRate, setGrowthRate] = useState(0.1);
  const [growthType, setGrowthType] = useState<'linear' | 'exponential' | 'logarithmic'>('linear');
  const [curve, setCurve] = useState<ReturnType<typeof generateBalanceCurve> | null>(null);

  const generate = () => {
    const result = generateBalanceCurve(
      { hp: baseHp, atk: baseAtk, def: baseDef, speed: baseSpeed },
      maxLevel,
      growthType,
      growthRate
    );
    setCurve(result);
  };

  return (
    <div className="space-y-4">
      {/* 탭 설명 */}
      <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #9179f2' }}>
        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>밸런스 커브 생성</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          레벨별 스탯 성장 곡선을 자동으로 생성합니다. 선형, 지수, 로그 등 다양한 성장 패턴을 지원합니다.
        </div>
        <div className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
          <strong>사용법:</strong> 기본 스탯, 최대 레벨, 성장률을 입력하고 성장 타입을 선택하세요. 생성된 테이블을 복사하여 스프레드시트에 붙여넣을 수 있습니다.
        </div>
      </div>

      {/* 기본 스탯 입력 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="glass-panel-header px-4 py-2.5">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>기본 스탯 (레벨 1)</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <StatInputField label="HP" value={baseHp} onChange={setBaseHp} />
          <StatInputField label="ATK" value={baseAtk} onChange={setBaseAtk} />
          <StatInputField label="DEF" value={baseDef} onChange={setBaseDef} />
          <StatInputField label="Speed" value={baseSpeed} onChange={setBaseSpeed} step={0.1} />
        </div>
      </div>

      {/* 성장 설정 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="glass-panel-header px-4 py-2.5">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>성장 설정</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatInputField label="최대 레벨" value={maxLevel} onChange={setMaxLevel} />
            <StatInputField label="레벨당 성장률" value={growthRate} onChange={setGrowthRate} step={0.05} />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>성장 타입</label>
            <div className="glass-tabs grid grid-cols-3 gap-2 mt-1 p-1 rounded-lg">
              {[
                { value: 'linear', label: '선형', desc: '일정한 성장' },
                { value: 'exponential', label: '지수', desc: '후반 급성장' },
                { value: 'logarithmic', label: '로그', desc: '초반 급성장' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGrowthType(opt.value as typeof growthType)}
                  className="p-2.5 rounded-lg text-center transition-all"
                  style={{
                    background: growthType === opt.value ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                    border: growthType === opt.value ? '1px solid #9179f2' : '1px solid transparent',
                  }}
                >
                  <div className="text-sm font-semibold" style={{ color: growthType === opt.value ? '#9179f2' : 'var(--text-primary)' }}>
                    {opt.label}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        className="glass-button-primary w-full px-4 py-2.5 rounded-lg text-sm font-medium"
        style={{ background: '#9179f2' }}
      >
        <div className="flex items-center justify-center gap-2">
          <Target className="w-4 h-4" />
          커브 생성
        </div>
      </button>

      {curve && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="glass-panel-header px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>생성된 성장표</span>
            <span className="glass-badge text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(145, 121, 242, 0.15)', color: '#9179f2' }}>
              {curve.levels.length} 레벨
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="glass-section">
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Lv</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#e86161' }}>HP</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#e5a440' }}>ATK</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#5a9cf5' }}>DEF</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#3db88a' }}>SPD</th>
                </tr>
              </thead>
              <tbody>
                {curve.levels.map((level, i) => (
                  <tr key={level} className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{level}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.hp[i]}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.atk[i]}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.def[i]}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.speed[i].toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
