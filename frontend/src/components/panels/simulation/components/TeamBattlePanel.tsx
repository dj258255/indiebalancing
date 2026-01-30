/**
 * TeamBattlePanel - 팀 전투 모드 UI 컴포넌트
 */

'use client';

import { X, Play, RefreshCw, User } from 'lucide-react';
import type { UnitStats, TeamBattleConfig } from '@/lib/simulation/types';
import type { TeamResult, TeamUnitModalState } from '../hooks/useSimulationState';
import { UnitPicker } from './UnitPicker';
import { useTranslations } from 'next-intl';

interface TeamBattlePanelProps {
  team1Units: UnitStats[];
  team2Units: UnitStats[];
  units: UnitStats[];
  targetingMode: TeamBattleConfig['targetingMode'];
  setTargetingMode: (mode: TeamBattleConfig['targetingMode']) => void;
  teamResult: TeamResult | null;
  isRunning: boolean;
  runs: number;
  setRuns: (runs: number) => void;
  onRunSimulation: () => void;
  onAddToTeam: (team: 1 | 2, unit: UnitStats) => void;
  onRemoveFromTeam: (team: 1 | 2, unitId: string) => void;
  onOpenModal: (state: TeamUnitModalState) => void;
}

export function TeamBattlePanel({
  team1Units,
  team2Units,
  units,
  targetingMode,
  setTargetingMode,
  teamResult,
  isRunning,
  runs,
  setRuns,
  onRunSimulation,
  onAddToTeam,
  onRemoveFromTeam,
  onOpenModal,
}: TeamBattlePanelProps) {
  const t = useTranslations('simulation');

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Team 1 */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--primary-blue)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium" style={{ color: 'var(--primary-blue)' }}>Team 1</div>
              <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: 'var(--primary-blue)20', color: 'var(--primary-blue)' }}>
                {team1Units.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenModal({ isOpen: true, teamNumber: 1, editUnit: null })}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{ background: 'var(--primary-blue)15', color: 'var(--primary-blue)', border: '1.5px solid var(--primary-blue)' }}
              >
                <User className="w-3 h-3" />
                {t('newUnit')}
              </button>
              {units.length > 0 && (
                <UnitPicker
                  units={units.filter(u => !team1Units.find(t => t.id === u.id))}
                  onSelect={(unit) => onAddToTeam(1, { ...unit, id: `team1_${Date.now()}_${unit.id}` })}
                  color="var(--primary-blue)"
                  buttonText={t('loadFromSheet')}
                />
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {team1Units.map((unit, i) => (
              <div
                key={unit.id}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:ring-1 hover:ring-[var(--primary-blue)] transition-all"
                style={{ background: 'var(--bg-primary)' }}
                onClick={() => onOpenModal({ isOpen: true, teamNumber: 1, editUnit: unit })}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: 'var(--primary-blue)20', color: 'var(--primary-blue)' }}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{unit.name}</div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>HP:{unit.maxHp}</span>
                      <span>ATK:{unit.atk}</span>
                      <span>DEF:{unit.def}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFromTeam(1, unit.id); }}
                  className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            ))}
            {team1Units.length === 0 && (
              <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('clickNewUnitOrSheet')}
              </div>
            )}
          </div>
        </div>

        {/* Team 2 */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--primary-red)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium" style={{ color: 'var(--primary-red)' }}>Team 2</div>
              <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: 'var(--primary-red)20', color: 'var(--primary-red)' }}>
                {team2Units.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenModal({ isOpen: true, teamNumber: 2, editUnit: null })}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{ background: 'var(--primary-red)15', color: 'var(--primary-red)', border: '1.5px solid var(--primary-red)' }}
              >
                <User className="w-3 h-3" />
                {t('newUnit')}
              </button>
              {units.length > 0 && (
                <UnitPicker
                  units={units.filter(u => !team2Units.find(t => t.id === u.id))}
                  onSelect={(unit) => onAddToTeam(2, { ...unit, id: `team2_${Date.now()}_${unit.id}` })}
                  color="var(--primary-red)"
                  buttonText={t('loadFromSheet')}
                />
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {team2Units.map((unit, i) => (
              <div
                key={unit.id}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:ring-1 hover:ring-[var(--primary-red)] transition-all"
                style={{ background: 'var(--bg-primary)' }}
                onClick={() => onOpenModal({ isOpen: true, teamNumber: 2, editUnit: unit })}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: 'var(--primary-red)20', color: 'var(--primary-red)' }}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{unit.name}</div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>HP:{unit.maxHp}</span>
                      <span>ATK:{unit.atk}</span>
                      <span>DEF:{unit.def}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFromTeam(2, unit.id); }}
                  className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            ))}
            {team2Units.length === 0 && (
              <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('clickNewUnitOrSheet')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 타겟팅 모드 선택 */}
      <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('targetingMode')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['random', 'lowest_hp', 'highest_atk', 'focused'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setTargetingMode(mode)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: targetingMode === mode ? 'var(--accent)' : 'var(--bg-primary)',
                color: targetingMode === mode ? 'white' : 'var(--text-secondary)',
              }}
            >
              {t(`targeting.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 팀 전투 실행 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onRunSimulation}
          disabled={team1Units.length === 0 || team2Units.length === 0 || isRunning}
          className="flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{
            background: isRunning ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: isRunning ? 'var(--text-secondary)' : 'white'
          }}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t('running')}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {t('runTeamSimulation')}
            </>
          )}
        </button>
        <select
          value={runs}
          onChange={(e) => setRuns(Number(e.target.value))}
          disabled={isRunning}
          className="px-3 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-primary)'
          }}
        >
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1K</option>
          <option value={5000}>5K</option>
        </select>
      </div>

      {/* 팀 전투 결과 */}
      {teamResult && (
        <TeamBattleResults
          teamResult={teamResult}
          team1Units={team1Units}
          team2Units={team2Units}
        />
      )}
    </>
  );
}

interface TeamBattleResultsProps {
  teamResult: TeamResult;
  team1Units: UnitStats[];
  team2Units: UnitStats[];
}

function TeamBattleResults({ teamResult, team1Units, team2Units }: TeamBattleResultsProps) {
  const t = useTranslations('simulation');

  return (
    <div className="space-y-4">
      {/* 승률 */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('teamWinRate')}</div>
          <div className="text-sm px-2 py-1 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            {teamResult.totalRuns.toLocaleString()}전
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium" style={{ color: 'var(--primary-blue)' }}>Team 1 ({team1Units.length}명)</span>
              <span className="px-2 py-0.5 rounded" style={{ background: 'var(--primary-blue)15', color: 'var(--primary-blue)' }}>
                {teamResult.team1Wins.toLocaleString()}승
              </span>
            </div>
            <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
              <div
                className="absolute h-full transition-all"
                style={{
                  width: `${teamResult.team1WinRate * 100}%`,
                  background: 'var(--primary-blue)'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-primary)', textShadow: '0 0 4px var(--bg-primary)' }}>
                {(teamResult.team1WinRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium" style={{ color: 'var(--primary-red)' }}>Team 2 ({team2Units.length}명)</span>
              <span className="px-2 py-0.5 rounded" style={{ background: 'var(--primary-red)15', color: 'var(--primary-red)' }}>
                {teamResult.team2Wins.toLocaleString()}승
              </span>
            </div>
            <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
              <div
                className="absolute h-full transition-all"
                style={{
                  width: `${teamResult.team2WinRate * 100}%`,
                  background: 'var(--primary-red)'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-primary)', textShadow: '0 0 4px var(--bg-primary)' }}>
                {(teamResult.team2WinRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {teamResult.draws > 0 && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('draw')}: {teamResult.draws.toLocaleString()} ({((teamResult.draws / teamResult.totalRuns) * 100).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('avgBattleTime')}</div>
          <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
            {teamResult.avgDuration.toFixed(1)}s
          </div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('avgSurvivors')} (T1)</div>
          <div className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
            {teamResult.avgTeam1Survivors.toFixed(1)}
          </div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('avgSurvivors')} (T2)</div>
          <div className="text-xl font-bold" style={{ color: 'var(--primary-red)' }}>
            {teamResult.avgTeam2Survivors.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
