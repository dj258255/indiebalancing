/**
 * SettingsEditors - 프리셋, 플레이타임, 벽 스테이지, 마일스톤 설정 컴포넌트들
 */

'use client';

import { Layers, Clock, Wand2, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { CURVE_PRESETS, PLAYTIME_TARGETS, type PresetKey, type PlaytimeKey, type MilestoneData } from '../hooks';

const PANEL_COLOR = '#9179f2';

// 프리셋 선택
interface PresetSelectorProps {
  preset: PresetKey;
  setPreset: (preset: PresetKey) => void;
}

export function PresetSelector({ preset, setPreset }: PresetSelectorProps) {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4" style={{ color: PANEL_COLOR }} />
        <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('presetLabel')}
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(CURVE_PRESETS).map(([key]) => (
          <button
            key={key}
            onClick={() => setPreset(key as PresetKey)}
            className={cn(
              'glass-card p-3 text-left transition-all duration-200',
              preset === key && 'ring-2'
            )}
            style={{
              // @ts-expect-error CSS ring color custom property
              '--tw-ring-color': preset === key ? PANEL_COLOR : undefined,
              background: preset === key ? `${PANEL_COLOR}10` : undefined,
            }}
          >
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {t(`presets.${key}`)}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {t(`presets.${key}Desc`)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// 플레이타임 선택
interface PlaytimeSelectorProps {
  playtime: PlaytimeKey;
  setPlaytime: (playtime: PlaytimeKey) => void;
  onGenerateRecommended: () => void;
  wallStages: number[];
  estimatedDays: Record<number, number>;
  maxStage: number;
}

export function PlaytimeSelector({
  playtime,
  setPlaytime,
  onGenerateRecommended,
  wallStages,
  estimatedDays,
  maxStage,
}: PlaytimeSelectorProps) {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: PANEL_COLOR }} />
          <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('playtimeLabel')}
          </label>
        </div>
        <button
          onClick={onGenerateRecommended}
          className="glass-button-primary flex items-center gap-1.5 !px-3 !py-1.5 text-sm"
          style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}dd)` }}
        >
          <Wand2 className="w-3.5 h-3.5" />
          {t('autoPlace')}
        </button>
      </div>
      <div className="glass-tabs">
        {Object.entries(PLAYTIME_TARGETS).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setPlaytime(key as PlaytimeKey)}
            className={cn('glass-tab flex-1 text-center', playtime === key && 'active')}
          >
            <div className="text-sm font-medium">{t(`playtime.${key}`)}</div>
            <div className="text-sm opacity-60 mt-0.5">
              {t('playtime.wallInterval', { interval: value.wallInterval })}
            </div>
          </button>
        ))}
      </div>

      {/* 예상 진행 시간 */}
      <div
        className="glass-section p-3 mt-2"
        style={{ background: `${PANEL_COLOR}08` }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {t('estimatedTime')}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            ({t(`playtime.${playtime}`)} {t('basis')})
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {wallStages.slice(0, 4).map((stage) => (
            <div key={stage} className="flex items-center gap-1.5 text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>{t('stage')} {stage}:</span>
              <span className="font-semibold" style={{ color: PANEL_COLOR }}>
                {t('approxDays', { days: estimatedDays[stage] || 0 })}
              </span>
            </div>
          ))}
          {wallStages.length > 4 && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>+{wallStages.length - 4}</span>
          )}
          <div className="flex items-center gap-1.5 text-sm ml-auto">
            <span style={{ color: 'var(--text-secondary)' }}>{t('finalStage')}:</span>
            <span className="font-bold" style={{ color: PANEL_COLOR }}>
              {t('approxDays', { days: estimatedDays[maxStage] || 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 최대 스테이지 슬라이더
interface MaxStageSelectorProps {
  maxStage: number;
  setMaxStage: (stage: number) => void;
}

export function MaxStageSelector({ maxStage, setMaxStage }: MaxStageSelectorProps) {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('maxStage')}
        </label>
        <span
          className="glass-badge font-bold"
          style={{ color: PANEL_COLOR }}
        >
          {maxStage}
        </span>
      </div>
      <div className="glass-section p-3">
        <input
          type="range"
          min="50"
          max="500"
          step="10"
          value={maxStage}
          onChange={(e) => setMaxStage(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${PANEL_COLOR} 0%, ${PANEL_COLOR} ${((maxStage - 50) / 450) * 100}%, var(--bg-tertiary) ${((maxStage - 50) / 450) * 100}%, var(--bg-tertiary) 100%)`,
          }}
        />
        <div className="flex justify-between mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>50</span>
          <span>500</span>
        </div>
      </div>
    </div>
  );
}

// 벽 스테이지 편집기
interface WallStageEditorProps {
  wallStages: number[];
  maxStage: number;
  onAdd: (stage: number) => void;
  onRemove: (stage: number) => void;
}

export function WallStageEditor({ wallStages, maxStage, onAdd, onRemove }: WallStageEditorProps) {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" style={{ color: '#e86161' }} />
        <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('wallStages')}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {wallStages.map((stage) => (
          <div
            key={stage}
            className="glass-badge flex items-center gap-1.5 pr-1"
            style={{ background: 'rgba(232, 97, 97, 0.1)', color: '#e86161' }}
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="font-medium">{t('stage')} {stage}</span>
            <button
              onClick={() => onRemove(stage)}
              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        <input
          type="number"
          placeholder={`${t('add')}...`}
          className="glass-input hide-spinner !w-20 !px-2 !py-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = Number((e.target as HTMLInputElement).value);
              if (value > 0 && value <= maxStage) {
                onAdd(value);
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />
      </div>
    </div>
  );
}

// 마일스톤 편집기
interface MilestoneEditorProps {
  milestones: Record<number, MilestoneData>;
  onUpdate: (stage: number, name: string, powerBonus?: number) => void;
  onUpdateBonus: (stage: number, powerBonus: number) => void;
}

export function MilestoneEditor({ milestones, onUpdate, onUpdateBonus }: MilestoneEditorProps) {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: '#3db88a' }} />
          <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('milestones')}
          </label>
        </div>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('powerBonusNote')}
        </span>
      </div>
      <div className="space-y-2">
        {Object.entries(milestones).map(([stage, data]) => (
          <div key={stage} className="glass-card p-2.5 flex items-center gap-2">
            <span
              className="glass-badge shrink-0 font-bold"
              style={{ background: 'rgba(61, 184, 138, 0.1)', color: '#3db88a' }}
            >
              {stage}
            </span>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onUpdate(Number(stage), e.target.value)}
              className="glass-input flex-1 !py-1.5 text-sm"
              placeholder={t('contentName')}
            />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>+</span>
              <input
                type="number"
                value={data.powerBonus}
                onChange={(e) => onUpdateBonus(Number(stage), Number(e.target.value))}
                className="glass-input hide-spinner !w-14 !px-2 !py-1.5 text-sm text-center"
                min={0}
                max={200}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>%</span>
            </div>
            <button
              onClick={() => onUpdate(Number(stage), '')}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors"
              style={{ color: '#e86161' }}
            >
              ×
            </button>
          </div>
        ))}
        <div className="glass-section p-2.5 flex items-center gap-2">
          <input
            type="number"
            placeholder={t('stage')}
            className="glass-input hide-spinner !w-16 !px-2 !py-1.5 text-sm"
            id="newMilestoneStage"
          />
          <input
            type="text"
            placeholder={`${t('unlockContent')}`}
            className="glass-input flex-1 !py-1.5 text-sm"
            id="newMilestoneText"
          />
          <input
            type="number"
            placeholder="%"
            className="glass-input hide-spinner !w-14 !px-2 !py-1.5 text-sm text-center"
            id="newMilestoneBonus"
            defaultValue={30}
          />
          <button
            onClick={() => {
              const stageInput = document.getElementById('newMilestoneStage') as HTMLInputElement;
              const textInput = document.getElementById('newMilestoneText') as HTMLInputElement;
              const bonusInput = document.getElementById('newMilestoneBonus') as HTMLInputElement;
              const stage = Number(stageInput.value);
              if (stage > 0 && textInput.value.trim()) {
                onUpdate(stage, textInput.value, Number(bonusInput.value) || 30);
                stageInput.value = '';
                textInput.value = '';
                bonusInput.value = '30';
              }
            }}
            className="glass-button-primary !px-3 !py-1.5 text-sm"
            style={{ background: `linear-gradient(135deg, #3db88a, #2f9e75)` }}
          >
            {t('add')}
          </button>
        </div>
      </div>
    </div>
  );
}
