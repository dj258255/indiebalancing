'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Zap, Heart, Shield, RotateCcw, Target, Users } from 'lucide-react';
import type { Skill, SkillType } from '@/lib/simulation/types';

interface SkillEditorProps {
  skills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
  color?: string;
}

const SKILL_TYPES: { type: SkillType; icon: typeof Zap; label: string; desc: string; color: string }[] = [
  { type: 'damage', icon: Zap, label: 'skillDamage', desc: 'skillDamageDesc', color: '#f97316' },
  { type: 'heal', icon: Heart, label: 'skillHeal', desc: 'skillHealDesc', color: '#22c55e' },
  { type: 'hot', icon: Heart, label: 'skillHoT', desc: 'skillHoTDesc', color: '#10b981' },
  { type: 'invincible', icon: Shield, label: 'skillInvincible', desc: 'skillInvincibleDesc', color: '#3b82f6' },
  { type: 'revive', icon: RotateCcw, label: 'skillRevive', desc: 'skillReviveDesc', color: '#a855f7' },
  { type: 'aoe_damage', icon: Target, label: 'skillAoeDamage', desc: 'skillAoeDamageDesc', color: '#ef4444' },
  { type: 'aoe_heal', icon: Users, label: 'skillAoeHeal', desc: 'skillAoeHealDesc', color: '#14b8a6' },
];

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  color: string;
}

function Tooltip({ children, content, color }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      const y = triggerRect.top - tooltipRect.height - 8;

      // Prevent tooltip from going off-screen
      if (x < 8) x = 8;
      if (x + tooltipRect.width > window.innerWidth - 8) {
        x = window.innerWidth - tooltipRect.width - 8;
      }

      setPosition({ x, y });
      setIsPositioned(true);
    } else {
      setIsPositioned(false);
    }
  }, [isHovered]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative inline-block"
    >
      {children}
      {isHovered && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-2 rounded-lg shadow-lg text-xs max-w-[200px] pointer-events-none transition-opacity duration-150"
          style={{
            left: position.x,
            top: position.y,
            opacity: isPositioned ? 1 : 0,
            background: 'var(--bg-primary)',
            border: `1px solid ${color}`,
            color: 'var(--text-primary)',
            boxShadow: `0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px ${color}30`
          }}
        >
          {content}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
            style={{
              bottom: -5,
              background: 'var(--bg-primary)',
              borderRight: `1px solid ${color}`,
              borderBottom: `1px solid ${color}`
            }}
          />
        </div>
      )}
    </div>
  );
}

const TRIGGER_TYPES = [
  { type: 'always' as const, label: 'triggerAlways' },
  { type: 'hp_below' as const, label: 'triggerHpBelow' },
  { type: 'hp_above' as const, label: 'triggerHpAbove' },
  { type: 'on_hit' as const, label: 'triggerOnHit' },
  { type: 'on_crit' as const, label: 'triggerOnCrit' },
];

export function SkillEditor({ skills, onSkillsChange, color = 'var(--primary-blue)' }: SkillEditorProps) {
  const t = useTranslations('simulation');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const addSkill = (type: SkillType) => {
    const newSkill: Skill = {
      id: `skill_${Date.now()}`,
      name: t(SKILL_TYPES.find(s => s.type === type)?.label || 'skillDamage'),
      damage: type === 'damage' || type === 'aoe_damage' ? 1.5 : 0,
      damageType: 'multiplier',
      cooldown: 5,
      skillType: type,
      trigger: { type: 'always', chance: 1 },
      // 스킬 타입별 기본값
      ...(type === 'heal' && { healAmount: 0.2, healType: 'percent' as const }),
      ...(type === 'hot' && { hotDuration: 5, hotTickInterval: 1, hotAmount: 0.05, hotType: 'percent' as const }),
      ...(type === 'invincible' && { invincibleDuration: 2 }),
      ...(type === 'revive' && { reviveHpPercent: 0.3, trigger: { type: 'always' as const, chance: 0.5 } }),
      ...(type === 'aoe_damage' && { aoeTargetCount: undefined, aoeTargetMode: 'all' as const }),
      ...(type === 'aoe_heal' && { healAmount: 0.15, healType: 'percent' as const, aoeTargetCount: undefined, aoeTargetMode: 'all' as const }),
    };
    onSkillsChange([...skills, newSkill]);
    setExpandedSkill(newSkill.id);
  };

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    onSkillsChange(skills.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSkill = (id: string) => {
    onSkillsChange(skills.filter(s => s.id !== id));
    if (expandedSkill === id) setExpandedSkill(null);
  };

  const getSkillTypeInfo = (type: SkillType) => {
    return SKILL_TYPES.find(s => s.type === type) || SKILL_TYPES[0];
  };

  return (
    <div className="space-y-3">
      {/* 스킬 추가 버튼들 */}
      <div className="flex flex-wrap gap-1">
        {SKILL_TYPES.map(({ type, icon: Icon, label, desc, color: skillColor }) => (
          <Tooltip
            key={type}
            content={`${t(label)}: ${t(desc)}`}
            color={skillColor}
          >
            <button
              onClick={() => addSkill(type)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:scale-105"
              style={{
                background: `${skillColor}20`,
                color: skillColor,
                border: `1px solid ${skillColor}40`
              }}
            >
              <Icon className="w-3 h-3" />
              <Plus className="w-2.5 h-2.5" />
            </button>
          </Tooltip>
        ))}
      </div>

      {/* 스킬 목록 */}
      {skills.length > 0 && (
        <div className="space-y-2">
          {skills.map(skill => {
            const typeInfo = getSkillTypeInfo(skill.skillType || 'damage');
            const isExpanded = expandedSkill === skill.id;
            const Icon = typeInfo.icon;

            return (
              <div
                key={skill.id}
                className="rounded-lg overflow-hidden"
                style={{ background: 'var(--bg-primary)', border: `1px solid ${typeInfo.color}30` }}
              >
                {/* 스킬 헤더 */}
                <div
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-black/5"
                  onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ background: `${typeInfo.color}20` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: typeInfo.color }} />
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {skill.name}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        CD: {skill.cooldown}s
                        {skill.trigger?.chance && skill.trigger.chance < 1 && ` | ${Math.round(skill.trigger.chance * 100)}%`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSkill(skill.id); }}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </div>

                {/* 스킬 상세 설정 */}
                {isExpanded && (
                  <div className="p-3 border-t space-y-3" style={{ borderColor: 'var(--border-primary)' }}>
                    {/* 스킬 이름 */}
                    <div>
                      <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                        {t('skillName')}
                      </label>
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
                        className="w-full px-2 py-1.5 rounded text-xs"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    {/* 쿨다운 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                          {t('cooldown')} (s)
                        </label>
                        <input
                          type="number"
                          value={skill.cooldown}
                          onChange={(e) => updateSkill(skill.id, { cooldown: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          min={0}
                          step={0.5}
                        />
                      </div>

                      {/* 발동 확률 */}
                      <div>
                        <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                          {t('triggerChance')} (%)
                        </label>
                        <input
                          type="number"
                          value={Math.round((skill.trigger?.chance || 1) * 100)}
                          onChange={(e) => updateSkill(skill.id, {
                            trigger: { ...skill.trigger, type: skill.trigger?.type || 'always', chance: Number(e.target.value) / 100 }
                          })}
                          className="w-full px-2 py-1.5 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          min={1}
                          max={100}
                        />
                      </div>
                    </div>

                    {/* 트리거 타입 */}
                    <div>
                      <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                        {t('triggerCondition')}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {TRIGGER_TYPES.map(({ type, label }) => (
                          <button
                            key={type}
                            onClick={() => updateSkill(skill.id, {
                              trigger: { ...skill.trigger, type, chance: skill.trigger?.chance || 1 }
                            })}
                            className="px-2 py-1 rounded text-[10px] transition-colors"
                            style={{
                              background: skill.trigger?.type === type ? `${color}30` : 'var(--bg-secondary)',
                              color: skill.trigger?.type === type ? color : 'var(--text-tertiary)',
                              border: `1px solid ${skill.trigger?.type === type ? color : 'var(--border-primary)'}`
                            }}
                          >
                            {t(label)}
                          </button>
                        ))}
                      </div>
                      {(skill.trigger?.type === 'hp_below' || skill.trigger?.type === 'hp_above') && (
                        <div className="mt-2">
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            HP {t('threshold')} (%)
                          </label>
                          <input
                            type="number"
                            value={Math.round((skill.trigger?.value || 0.5) * 100)}
                            onChange={(e) => updateSkill(skill.id, {
                              trigger: { ...skill.trigger, type: skill.trigger?.type || 'always', value: Number(e.target.value) / 100 }
                            })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                            min={1}
                            max={99}
                          />
                        </div>
                      )}
                    </div>

                    {/* 스킬 타입별 설정 */}
                    {(skill.skillType === 'damage' || skill.skillType === 'aoe_damage') && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {t('damageType')}
                          </label>
                          <select
                            value={skill.damageType}
                            onChange={(e) => updateSkill(skill.id, { damageType: e.target.value as 'flat' | 'multiplier' })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          >
                            <option value="multiplier">{t('atkMultiplier')}</option>
                            <option value="flat">{t('flatDamage')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {skill.damageType === 'multiplier' ? t('multiplier') : t('damage')}
                          </label>
                          <input
                            type="number"
                            value={skill.damage}
                            onChange={(e) => updateSkill(skill.id, { damage: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                            min={0}
                            step={skill.damageType === 'multiplier' ? 0.1 : 1}
                          />
                        </div>
                      </div>
                    )}

                    {(skill.skillType === 'heal' || skill.skillType === 'aoe_heal') && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {t('healType')}
                          </label>
                          <select
                            value={skill.healType || 'percent'}
                            onChange={(e) => updateSkill(skill.id, { healType: e.target.value as 'flat' | 'percent' })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          >
                            <option value="percent">{t('percentHeal')}</option>
                            <option value="flat">{t('flatHeal')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {skill.healType === 'percent' ? t('healPercent') : t('healAmount')}
                          </label>
                          <input
                            type="number"
                            value={skill.healType === 'percent' ? Math.round((skill.healAmount || 0) * 100) : (skill.healAmount || 0)}
                            onChange={(e) => updateSkill(skill.id, {
                              healAmount: skill.healType === 'percent' ? Number(e.target.value) / 100 : Number(e.target.value)
                            })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                            min={0}
                          />
                        </div>
                      </div>
                    )}

                    {skill.skillType === 'hot' && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {t('duration')} (s)
                          </label>
                          <input
                            type="number"
                            value={skill.hotDuration || 5}
                            onChange={(e) => updateSkill(skill.id, { hotDuration: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {t('tickInterval')} (s)
                          </label>
                          <input
                            type="number"
                            value={skill.hotTickInterval || 1}
                            onChange={(e) => updateSkill(skill.id, { hotTickInterval: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                            min={0.1}
                            step={0.1}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {t('tickHeal')} (%)
                          </label>
                          <input
                            type="number"
                            value={Math.round((skill.hotAmount || 0.05) * 100)}
                            onChange={(e) => updateSkill(skill.id, { hotAmount: Number(e.target.value) / 100 })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                            min={1}
                          />
                        </div>
                      </div>
                    )}

                    {skill.skillType === 'invincible' && (
                      <div>
                        <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                          {t('invincibleDuration')} (s)
                        </label>
                        <input
                          type="number"
                          value={skill.invincibleDuration || 2}
                          onChange={(e) => updateSkill(skill.id, { invincibleDuration: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          min={0.1}
                          step={0.1}
                        />
                      </div>
                    )}

                    {skill.skillType === 'revive' && (
                      <div>
                        <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                          {t('reviveHpPercent')} (%)
                        </label>
                        <input
                          type="number"
                          value={Math.round((skill.reviveHpPercent || 0.3) * 100)}
                          onChange={(e) => updateSkill(skill.id, { reviveHpPercent: Number(e.target.value) / 100 })}
                          className="w-full px-2 py-1.5 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          min={1}
                          max={100}
                        />
                      </div>
                    )}

                    {(skill.skillType === 'aoe_damage' || skill.skillType === 'aoe_heal') && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {t('aoeTargetCount')}
                          </label>
                          <input
                            type="number"
                            value={skill.aoeTargetCount || ''}
                            placeholder={t('all')}
                            onChange={(e) => updateSkill(skill.id, {
                              aoeTargetCount: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                            {t('aoeTargetMode')}
                          </label>
                          <select
                            value={skill.aoeTargetMode || 'all'}
                            onChange={(e) => updateSkill(skill.id, { aoeTargetMode: e.target.value as Skill['aoeTargetMode'] })}
                            className="w-full px-2 py-1.5 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          >
                            <option value="all">{t('targetAll')}</option>
                            <option value="random">{t('targetRandom')}</option>
                            <option value="lowest_hp">{t('targetLowestHp')}</option>
                            <option value="highest_hp">{t('targetHighestHp')}</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {skills.length === 0 && (
        <div
          className="text-center py-4 rounded-lg text-xs"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
        >
          {t('noSkills')}
        </div>
      )}
    </div>
  );
}
