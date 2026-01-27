'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useEscapeKey } from '@/hooks';
import { X, Heart, Swords, Shield, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import type { UnitStats, Skill } from '@/lib/simulation/types';
import { SkillEditor } from './SkillEditor';

interface UnitWithSkills extends UnitStats {
  skills?: Skill[];
}

interface TeamUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unit: UnitWithSkills) => void;
  unit: UnitWithSkills | null;
  teamNumber: 1 | 2;
  units: UnitStats[];
  onLoadFromSheet: (unit: UnitStats) => void;
}

export function TeamUnitModal({
  isOpen,
  onClose,
  onSave,
  unit,
  teamNumber,
  units,
  onLoadFromSheet
}: TeamUnitModalProps) {
  const t = useTranslations('simulation');
  const tCommon = useTranslations('common');

  const defaultUnit: UnitWithSkills = {
    id: `team${teamNumber}_${Date.now()}`,
    name: `Unit ${teamNumber === 1 ? 'A' : 'B'}`,
    hp: 1000,
    maxHp: 1000,
    atk: 100,
    def: 50,
    speed: 1,
    skills: []
  };

  const [editUnit, setEditUnit] = useState<UnitWithSkills>(unit || defaultUnit);
  const [showSkills, setShowSkills] = useState(false);
  const color = teamNumber === 1 ? 'var(--primary-blue)' : 'var(--primary-red)';

  useEffect(() => {
    if (isOpen) {
      setEditUnit(unit || {
        ...defaultUnit,
        id: `team${teamNumber}_${Date.now()}`
      });
      setShowSkills(!!unit?.skills?.length);
    }
  }, [isOpen, unit, teamNumber]);

  // ESC 키로 닫기
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: `${color}15`, borderBottom: `2px solid ${color}` }}>
          <h3 className="font-semibold" style={{ color }}>
            {unit ? t('edit') || '유닛 편집' : t('newUnit') || '새 유닛 추가'} (Team {teamNumber})
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-tertiary)]">
            <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* 본문 - 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 시트에서 불러오기 */}
          {units.length > 0 && (
            <div>
              <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{t('loadFromSheet')}</label>
              <select
                onChange={(e) => {
                  const selected = units.find(u => u.id === e.target.value);
                  if (selected) {
                    setEditUnit({
                      ...selected,
                      id: `team${teamNumber}_${Date.now()}`,
                      skills: editUnit.skills
                    });
                  }
                }}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                defaultValue=""
              >
                <option value="" disabled>{t('select')}</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name} (HP:{u.maxHp} ATK:{u.atk})</option>
                ))}
              </select>
            </div>
          )}

          {/* 이름 */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('colName') || '이름'}</label>
            <input
              type="text"
              value={editUnit.name}
              onChange={(e) => setEditUnit(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
              placeholder="유닛 이름"
            />
          </div>

          {/* 스탯 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs mb-1" style={{ color: '#ef4444' }}>
                <Heart className="w-3 h-3" /> HP
              </label>
              <input
                type="number"
                value={editUnit.maxHp}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setEditUnit(prev => ({ ...prev, maxHp: v, hp: v }));
                }}
                className="w-full px-3 py-2 rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs mb-1" style={{ color: '#f59e0b' }}>
                <Swords className="w-3 h-3" /> ATK
              </label>
              <input
                type="number"
                value={editUnit.atk}
                onChange={(e) => setEditUnit(prev => ({ ...prev, atk: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs mb-1" style={{ color: '#3b82f6' }}>
                <Shield className="w-3 h-3" /> DEF
              </label>
              <input
                type="number"
                value={editUnit.def}
                onChange={(e) => setEditUnit(prev => ({ ...prev, def: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs mb-1" style={{ color: '#8b5cf6' }}>
                <Zap className="w-3 h-3" /> SPD
              </label>
              <input
                type="number"
                value={editUnit.speed}
                onChange={(e) => setEditUnit(prev => ({ ...prev, speed: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                step="0.1"
              />
            </div>
          </div>

          {/* 선택적 스탯 */}
          <details className="group">
            <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
              고급 옵션 (크리티컬, 명중, 회피)
            </summary>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('colCritRate') || '크리율'} %</label>
                <input
                  type="number"
                  value={(editUnit.critRate || 0) * 100}
                  onChange={(e) => setEditUnit(prev => ({ ...prev, critRate: Number(e.target.value) / 100 }))}
                  className="w-full px-2 py-1.5 rounded text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('colCritDmg') || '크리뎀'} x</label>
                <input
                  type="number"
                  value={editUnit.critDamage || 1.5}
                  onChange={(e) => setEditUnit(prev => ({ ...prev, critDamage: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 rounded text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>회피 %</label>
                <input
                  type="number"
                  value={(editUnit.evasion || 0) * 100}
                  onChange={(e) => setEditUnit(prev => ({ ...prev, evasion: Number(e.target.value) / 100 }))}
                  className="w-full px-2 py-1.5 rounded text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </details>

          {/* 스킬 섹션 */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border-primary)' }}
          >
            <button
              onClick={() => setShowSkills(!showSkills)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-black/5"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              <span className="flex items-center gap-2">
                {t('skills')}
                {editUnit.skills && editUnit.skills.length > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px]"
                    style={{ background: `${color}20`, color }}
                  >
                    {editUnit.skills.length}
                  </span>
                )}
              </span>
              {showSkills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSkills && (
              <div className="p-3" style={{ background: 'var(--bg-secondary)' }}>
                <SkillEditor
                  skills={editUnit.skills || []}
                  onSkillsChange={(skills) => setEditUnit(prev => ({ ...prev, skills }))}
                  color={color}
                />
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex gap-2 px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            {tCommon('cancel')}
          </button>
          <button
            onClick={() => {
              onSave(editUnit);
              onClose();
            }}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: color, color: 'white' }}
          >
            {unit ? tCommon('save') : tCommon('add')}
          </button>
        </div>
      </div>
    </div>
  );
}
