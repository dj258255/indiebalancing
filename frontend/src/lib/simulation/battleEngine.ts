/**
 * 전투 시뮬레이션 엔진
 */

import type {
  UnitStats,
  Skill,
  BattleConfig,
  BattleLogEntry,
  BattleResult,
  ArmorPenetrationConfig,
  DefenseFormulaType,
} from './types';

// 기본 설정
const DEFAULT_CONFIG: BattleConfig = {
  maxDuration: 300,  // 5분
  timeStep: 0.1,     // 0.1초 단위
  damageFormula: 'simple',
  defenseFormula: 'subtractive',
  allowOverkill: false,
};

/**
 * 방어관통 적용된 유효 방어력 계산
 * LoL/Dota 스타일: 퍼센트 감소 → 고정 감소 → 퍼센트 관통 → 고정 관통
 */
function calculateEffectiveDefense(
  baseDef: number,
  penetration?: ArmorPenetrationConfig
): number {
  if (!penetration) return baseDef;

  let effectiveDef = baseDef;

  // 1. 퍼센트 방어 감소 (디버프)
  if (penetration.percentReduction && penetration.percentReduction > 0) {
    effectiveDef *= (1 - Math.min(1, penetration.percentReduction));
  }

  // 2. 고정 방어 감소 (디버프)
  if (penetration.flatReduction && penetration.flatReduction > 0) {
    effectiveDef = Math.max(0, effectiveDef - penetration.flatReduction);
  }

  // 3. 퍼센트 방어 관통 (공격자 스탯)
  if (penetration.percentPenetration && penetration.percentPenetration > 0) {
    effectiveDef *= (1 - Math.min(1, penetration.percentPenetration));
  }

  // 4. 고정 방어 관통 / Lethality (공격자 스탯)
  if (penetration.flatPenetration && penetration.flatPenetration > 0) {
    effectiveDef = Math.max(0, effectiveDef - penetration.flatPenetration);
  }

  return effectiveDef;
}

/**
 * 방어 공식에 따른 피해 감소율 계산
 */
function calculateDamageReduction(
  defense: number,
  formula: DefenseFormulaType = 'subtractive',
  baseDamage?: number
): { reduction: number; minDamage: number } {
  switch (formula) {
    case 'subtractive':
      // 빼기식: damage = ATK - DEF (최소 1)
      return { reduction: defense, minDamage: 1 };

    case 'divisive':
      // 나누기식 (LoL/WoW): reduction = DEF / (DEF + 100)
      // 100 방어력 = 50% 감소, 200 방어력 = 66.7% 감소
      const divisiveReduction = defense / (defense + 100);
      return { reduction: divisiveReduction, minDamage: 1 };

    case 'multiplicative':
      // 곱셈식: damage = ATK * (1 - DEF%)
      // DEF가 0~100 사이의 퍼센트 값이라고 가정
      const percentReduction = Math.min(0.9, defense / 100);
      return { reduction: percentReduction, minDamage: 1 };

    case 'logarithmic':
      // 로그식: reduction = log10(DEF + 10) / 5
      // 극후반 스케일링에서 수확체감 효과
      const logReduction = Math.min(0.9, Math.log10(defense + 10) / 5);
      return { reduction: logReduction, minDamage: 1 };

    default:
      return { reduction: defense, minDamage: 1 };
  }
}

/**
 * 데미지 계산 (방어관통 및 다양한 방어 공식 지원)
 */
function calculateDamage(
  attacker: UnitStats,
  defender: UnitStats,
  formula: BattleConfig['damageFormula'] = 'simple',
  defFormula: DefenseFormulaType = 'subtractive',
  armorPen?: ArmorPenetrationConfig
): { damage: number; isCrit: boolean; isMiss: boolean; effectiveDef: number } {
  // 명중 체크
  const accuracy = attacker.accuracy ?? 1;
  const evasion = defender.evasion ?? 0;
  const hitChance = Math.max(0, Math.min(1, accuracy - evasion));

  if (Math.random() > hitChance) {
    return { damage: 0, isCrit: false, isMiss: true, effectiveDef: defender.def };
  }

  // 크리티컬 체크
  const critRate = attacker.critRate ?? 0;
  const isCrit = Math.random() < critRate;
  const critMultiplier = isCrit ? (attacker.critDamage ?? 1.5) : 1;

  // 방어관통 적용한 유효 방어력 계산
  const effectiveDef = calculateEffectiveDefense(defender.def, armorPen);

  // 기본 데미지 계산 (damageFormula 기반)
  let baseDamage: number;

  switch (formula) {
    case 'simple':
      // 단순 공식: ATK - DEF (최소 1)
      baseDamage = Math.max(1, attacker.atk - effectiveDef);
      break;

    case 'mmorpg':
      // MMORPG 공식: ATK * (100 / (100 + DEF))
      baseDamage = attacker.atk * (100 / (100 + effectiveDef));
      break;

    case 'percentage':
      // 퍼센트 감소: ATK * (1 - DEF/200)
      const reduction = Math.min(0.9, effectiveDef / 200);
      baseDamage = attacker.atk * (1 - reduction);
      break;

    case 'random':
      // 랜덤 변동: ATK * random(0.9~1.1) - DEF
      const randomMultiplier = 0.9 + Math.random() * 0.2;
      baseDamage = Math.max(1, attacker.atk * randomMultiplier - effectiveDef);
      break;

    case 'multiplicative':
      // 곱셈식: 방어 공식에 따른 감소율 적용
      const defReduction = calculateDamageReduction(effectiveDef, defFormula);
      if (defFormula === 'subtractive') {
        baseDamage = Math.max(defReduction.minDamage, attacker.atk - defReduction.reduction);
      } else {
        baseDamage = Math.max(defReduction.minDamage, attacker.atk * (1 - defReduction.reduction));
      }
      break;

    default:
      baseDamage = Math.max(1, attacker.atk - effectiveDef);
  }

  // 크리티컬 적용
  const finalDamage = Math.round(baseDamage * critMultiplier);

  return { damage: finalDamage, isCrit, isMiss: false, effectiveDef };
}

/**
 * 단일 전투 시뮬레이션
 */
export function simulateBattle(
  unit1: UnitStats,
  unit2: UnitStats,
  skills1: Skill[] = [],
  skills2: Skill[] = [],
  config: Partial<BattleConfig> = {}
): BattleResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 유닛 상태 복사
  const state1 = { ...unit1, hp: unit1.maxHp };
  const state2 = { ...unit2, hp: unit2.maxHp };

  // 전투 로그
  const log: BattleLogEntry[] = [];

  // 통계
  let unit1TotalDamage = 0;
  let unit2TotalDamage = 0;
  let unit1Hits = 0;
  let unit2Hits = 0;
  let unit1Crits = 0;
  let unit2Crits = 0;

  // 공격 타이머 (공격 속도 기반)
  let unit1NextAttack = 1 / state1.speed;
  let unit2NextAttack = 1 / state2.speed;

  // 시뮬레이션 루프
  let time = 0;

  while (time < cfg.maxDuration && state1.hp > 0 && state2.hp > 0) {
    time += cfg.timeStep;

    // 동시 공격 처리: 같은 타임스텝에서 양쪽 데미지를 먼저 계산한 뒤 적용
    const unit1Attacks = time >= unit1NextAttack;
    const unit2Attacks = time >= unit2NextAttack;

    let unit1Result: ReturnType<typeof calculateDamage> | null = null;
    let unit2Result: ReturnType<typeof calculateDamage> | null = null;

    // 데미지 계산 (아직 적용 전)
    if (unit1Attacks) {
      unit1Result = calculateDamage(state1, state2, cfg.damageFormula, cfg.defenseFormula, cfg.armorPenetration);
    }
    if (unit2Attacks) {
      unit2Result = calculateDamage(state2, state1, cfg.damageFormula, cfg.defenseFormula, cfg.armorPenetration);
    }

    // 데미지 적용 (동시에)
    if (unit1Result && !unit1Result.isMiss) {
      state2.hp = cfg.allowOverkill
        ? state2.hp - unit1Result.damage
        : Math.max(0, state2.hp - unit1Result.damage);

      unit1TotalDamage += unit1Result.damage;
      unit1Hits++;
      if (unit1Result.isCrit) unit1Crits++;
    }

    if (unit2Result && !unit2Result.isMiss) {
      state1.hp = cfg.allowOverkill
        ? state1.hp - unit2Result.damage
        : Math.max(0, state1.hp - unit2Result.damage);

      unit2TotalDamage += unit2Result.damage;
      unit2Hits++;
      if (unit2Result.isCrit) unit2Crits++;
    }

    // 로그 기록
    if (unit1Result) {
      log.push({
        time: Math.round(time * 100) / 100,
        actor: state1.name,
        action: 'attack',
        target: state2.name,
        damage: unit1Result.damage,
        isCrit: unit1Result.isCrit,
        isMiss: unit1Result.isMiss,
        remainingHp: state2.hp,
      });
      unit1NextAttack = time + 1 / state1.speed;
    }

    if (unit2Result) {
      log.push({
        time: Math.round(time * 100) / 100,
        actor: state2.name,
        action: 'attack',
        target: state1.name,
        damage: unit2Result.damage,
        isCrit: unit2Result.isCrit,
        isMiss: unit2Result.isMiss,
        remainingHp: state1.hp,
      });
      unit2NextAttack = time + 1 / state2.speed;
    }
  }

  // 사망 로그
  if (state1.hp <= 0) {
    log.push({
      time: Math.round(time * 100) / 100,
      actor: state1.name,
      action: 'death',
    });
  }
  if (state2.hp <= 0) {
    log.push({
      time: Math.round(time * 100) / 100,
      actor: state2.name,
      action: 'death',
    });
  }

  // 승자 결정
  let winner: BattleResult['winner'];
  if (state1.hp <= 0 && state2.hp <= 0) {
    winner = 'draw';
  } else if (state1.hp <= 0) {
    winner = 'unit2';
  } else if (state2.hp <= 0) {
    winner = 'unit1';
  } else {
    // 시간 초과 - HP 비율로 승자 결정
    const ratio1 = state1.hp / state1.maxHp;
    const ratio2 = state2.hp / state2.maxHp;
    if (Math.abs(ratio1 - ratio2) < 0.01) {
      winner = 'draw';
    } else {
      winner = ratio1 > ratio2 ? 'unit1' : 'unit2';
    }
  }

  return {
    winner,
    duration: Math.round(time * 100) / 100,
    unit1FinalHp: Math.max(0, state1.hp),
    unit2FinalHp: Math.max(0, state2.hp),
    unit1TotalDamage,
    unit2TotalDamage,
    unit1Hits,
    unit2Hits,
    unit1Crits,
    unit2Crits,
    log,
  };
}

/**
 * 스킬 발동 조건 확인
 */
function shouldTriggerSkill(
  skill: Skill,
  caster: UnitStats & { hp: number },
  target: UnitStats & { hp: number },
  context: {
    time: number;
    lastHit?: boolean;
    lastCrit?: boolean;
    turnCount?: number;
  }
): boolean {
  if (!skill.trigger) return true;

  const { type, value = 0, chance = 1 } = skill.trigger;

  // 확률 체크
  if (Math.random() > chance) return false;

  switch (type) {
    case 'hp_below':
      return (caster.hp / caster.maxHp) <= value;
    case 'hp_above':
      return (caster.hp / caster.maxHp) >= value;
    case 'turn':
      return (context.turnCount || 0) % value === 0;
    case 'on_hit':
      return context.lastHit === true;
    case 'on_crit':
      return context.lastCrit === true;
    case 'always':
      return true;
    default:
      return false;
  }
}

/**
 * 스킬 데미지 계산
 */
function calculateSkillDamage(
  skill: Skill,
  caster: UnitStats,
  target: UnitStats,
  formula: BattleConfig['damageFormula'] = 'simple'
): number {
  let baseDamage: number;

  if (skill.damageType === 'flat') {
    baseDamage = skill.damage;
  } else {
    // multiplier: ATK * 배율
    baseDamage = caster.atk * skill.damage;
  }

  // 방어력 적용
  switch (formula) {
    case 'simple':
      return Math.max(1, baseDamage - target.def);
    case 'mmorpg':
      return baseDamage * (100 / (100 + target.def));
    case 'percentage':
      const reduction = Math.min(0.9, target.def / 200);
      return baseDamage * (1 - reduction);
    default:
      return Math.max(1, baseDamage - target.def);
  }
}

/**
 * 스킬이 있는 전투 시뮬레이션
 */
export function simulateBattleWithSkills(
  unit1: UnitStats,
  unit2: UnitStats,
  skills1: Skill[],
  skills2: Skill[],
  config: Partial<BattleConfig> = {}
): BattleResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 유닛 상태 복사
  const state1 = { ...unit1, hp: unit1.maxHp };
  const state2 = { ...unit2, hp: unit2.maxHp };

  // 전투 로그
  const log: BattleLogEntry[] = [];

  // 통계
  let unit1TotalDamage = 0;
  let unit2TotalDamage = 0;
  let unit1Hits = 0;
  let unit2Hits = 0;
  let unit1Crits = 0;
  let unit2Crits = 0;

  // 공격 타이머
  let unit1NextAttack = 1 / state1.speed;
  let unit2NextAttack = 1 / state2.speed;

  // 스킬 쿨다운 추적
  const skill1Cooldowns = new Map<string, number>();
  const skill2Cooldowns = new Map<string, number>();

  // 턴 카운터
  let unit1Turns = 0;
  let unit2Turns = 0;

  // 시뮬레이션 루프
  let time = 0;

  while (time < cfg.maxDuration && state1.hp > 0 && state2.hp > 0) {
    time += cfg.timeStep;

    // Unit1 공격
    if (time >= unit1NextAttack) {
      unit1Turns++;
      const result = calculateDamage(state1, state2, cfg.damageFormula, cfg.defenseFormula, cfg.armorPenetration);

      if (!result.isMiss) {
        state2.hp = cfg.allowOverkill
          ? state2.hp - result.damage
          : Math.max(0, state2.hp - result.damage);

        unit1TotalDamage += result.damage;
        unit1Hits++;
        if (result.isCrit) unit1Crits++;
      }

      log.push({
        time: Math.round(time * 100) / 100,
        actor: state1.name,
        action: 'attack',
        target: state2.name,
        damage: result.damage,
        isCrit: result.isCrit,
        isMiss: result.isMiss,
        remainingHp: state2.hp,
      });

      // 스킬 사용 체크
      for (const skill of skills1) {
        const cooldownEnds = skill1Cooldowns.get(skill.id) || 0;
        if (time < cooldownEnds) continue;

        const context = {
          time,
          lastHit: !result.isMiss,
          lastCrit: result.isCrit,
          turnCount: unit1Turns
        };

        if (shouldTriggerSkill(skill, state1, state2, context)) {
          const skillDamage = Math.round(calculateSkillDamage(skill, state1, state2, cfg.damageFormula));

          state2.hp = cfg.allowOverkill
            ? state2.hp - skillDamage
            : Math.max(0, state2.hp - skillDamage);

          unit1TotalDamage += skillDamage;

          log.push({
            time: Math.round(time * 100) / 100,
            actor: state1.name,
            action: 'skill',
            target: state2.name,
            skillName: skill.name,
            damage: skillDamage,
            remainingHp: state2.hp,
          });

          skill1Cooldowns.set(skill.id, time + skill.cooldown);
        }
      }

      unit1NextAttack = time + 1 / state1.speed;
    }

    // Unit2 공격
    if (state1.hp > 0 && time >= unit2NextAttack) {
      unit2Turns++;
      const result = calculateDamage(state2, state1, cfg.damageFormula, cfg.defenseFormula, cfg.armorPenetration);

      if (!result.isMiss) {
        state1.hp = cfg.allowOverkill
          ? state1.hp - result.damage
          : Math.max(0, state1.hp - result.damage);

        unit2TotalDamage += result.damage;
        unit2Hits++;
        if (result.isCrit) unit2Crits++;
      }

      log.push({
        time: Math.round(time * 100) / 100,
        actor: state2.name,
        action: 'attack',
        target: state1.name,
        damage: result.damage,
        isCrit: result.isCrit,
        isMiss: result.isMiss,
        remainingHp: state1.hp,
      });

      // 스킬 사용 체크
      for (const skill of skills2) {
        const cooldownEnds = skill2Cooldowns.get(skill.id) || 0;
        if (time < cooldownEnds) continue;

        const context = {
          time,
          lastHit: !result.isMiss,
          lastCrit: result.isCrit,
          turnCount: unit2Turns
        };

        if (shouldTriggerSkill(skill, state2, state1, context)) {
          const skillDamage = Math.round(calculateSkillDamage(skill, state2, state1, cfg.damageFormula));

          state1.hp = cfg.allowOverkill
            ? state1.hp - skillDamage
            : Math.max(0, state1.hp - skillDamage);

          unit2TotalDamage += skillDamage;

          log.push({
            time: Math.round(time * 100) / 100,
            actor: state2.name,
            action: 'skill',
            target: state1.name,
            skillName: skill.name,
            damage: skillDamage,
            remainingHp: state1.hp,
          });

          skill2Cooldowns.set(skill.id, time + skill.cooldown);
        }
      }

      unit2NextAttack = time + 1 / state2.speed;
    }
  }

  // 사망 로그
  if (state1.hp <= 0) {
    log.push({
      time: Math.round(time * 100) / 100,
      actor: state1.name,
      action: 'death',
    });
  }
  if (state2.hp <= 0) {
    log.push({
      time: Math.round(time * 100) / 100,
      actor: state2.name,
      action: 'death',
    });
  }

  // 승자 결정
  let winner: BattleResult['winner'];
  if (state1.hp <= 0 && state2.hp <= 0) {
    winner = 'draw';
  } else if (state1.hp <= 0) {
    winner = 'unit2';
  } else if (state2.hp <= 0) {
    winner = 'unit1';
  } else {
    const ratio1 = state1.hp / state1.maxHp;
    const ratio2 = state2.hp / state2.maxHp;
    if (Math.abs(ratio1 - ratio2) < 0.01) {
      winner = 'draw';
    } else {
      winner = ratio1 > ratio2 ? 'unit1' : 'unit2';
    }
  }

  return {
    winner,
    duration: Math.round(time * 100) / 100,
    unit1FinalHp: Math.max(0, state1.hp),
    unit2FinalHp: Math.max(0, state2.hp),
    unit1TotalDamage,
    unit2TotalDamage,
    unit1Hits,
    unit2Hits,
    unit1Crits,
    unit2Crits,
    log,
  };
}

/**
 * 시너지 효과 적용
 */
export function applySynergies(
  units: UnitStats[],
  synergies: import('./types').Synergy[]
): UnitStats[] {
  const unitIds = new Set(units.map(u => u.id));

  // 각 유닛에 적용될 버프 수집
  const unitBuffs = new Map<string, import('./types').Buff[]>();
  units.forEach(u => unitBuffs.set(u.id, []));

  // 시너지 조건 확인 및 버프 적용
  for (const synergy of synergies) {
    const hasAll = synergy.requiredUnits.every(id => unitIds.has(id));
    if (hasAll) {
      // 모든 유닛에 버프 적용
      for (const unit of units) {
        const buffs = unitBuffs.get(unit.id) || [];
        buffs.push(...synergy.effect);
        unitBuffs.set(unit.id, buffs);
      }
    }
  }

  // 버프 적용하여 새 유닛 배열 반환
  return units.map(unit => {
    const buffs = unitBuffs.get(unit.id) || [];
    if (buffs.length === 0) return unit;

    const modified = { ...unit };

    for (const buff of buffs) {
      const stat = buff.stat as keyof UnitStats;
      const currentValue = modified[stat];

      if (typeof currentValue === 'number') {
        if (buff.isPercent) {
          (modified as Record<string, unknown>)[stat] = currentValue * (1 + buff.value);
        } else {
          (modified as Record<string, unknown>)[stat] = currentValue + buff.value;
        }
      }
    }

    return modified;
  });
}

/**
 * 팀 전투 시뮬레이션 (1:N, N:N)
 */
export function simulateTeamBattle(
  team1: UnitStats[],
  team2: UnitStats[],
  config: Partial<import('./types').TeamBattleConfig> = {}
): import('./types').TeamBattleResult {
  const cfg: import('./types').TeamBattleConfig = {
    maxDuration: 300,
    timeStep: 0.1,
    damageFormula: 'simple',
    defenseFormula: 'subtractive',
    allowOverkill: false,
    teamSize: Math.max(team1.length, team2.length),
    targetingMode: 'random',
    allowSynergies: false,
    ...config,
  };

  // 유닛 상태 초기화
  interface UnitState extends UnitStats {
    currentHp: number;
    nextAttackTime: number;
    team: 'team1' | 'team2';
    damageDealt: number;
    damageTaken: number;
    kills: number;
    alive: boolean;
  }

  const team1States: UnitState[] = team1.map(u => ({
    ...u,
    currentHp: u.maxHp,
    nextAttackTime: 1 / u.speed,
    team: 'team1' as const,
    damageDealt: 0,
    damageTaken: 0,
    kills: 0,
    alive: true,
  }));

  const team2States: UnitState[] = team2.map(u => ({
    ...u,
    currentHp: u.maxHp,
    nextAttackTime: 1 / u.speed,
    team: 'team2' as const,
    damageDealt: 0,
    damageTaken: 0,
    kills: 0,
    alive: true,
  }));

  // 타겟 선택 함수
  const selectTarget = (
    enemies: UnitState[],
    mode: import('./types').TeamBattleConfig['targetingMode']
  ): UnitState | null => {
    const aliveEnemies = enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0) return null;

    switch (mode) {
      case 'lowest_hp':
        return aliveEnemies.reduce((min, e) =>
          e.currentHp < min.currentHp ? e : min
        );
      case 'highest_atk':
        return aliveEnemies.reduce((max, e) =>
          e.atk > max.atk ? e : max
        );
      case 'focused':
        // 첫 번째 살아있는 적 집중 공격
        return aliveEnemies[0];
      case 'random':
      default:
        return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    }
  };

  // 시뮬레이션 루프
  let time = 0;
  let team1TotalDamage = 0;
  let team2TotalDamage = 0;

  while (time < cfg.maxDuration) {
    time += cfg.timeStep;

    const team1Alive = team1States.filter(u => u.alive);
    const team2Alive = team2States.filter(u => u.alive);

    // 한 팀이 전멸하면 종료
    if (team1Alive.length === 0 || team2Alive.length === 0) break;

    // Team1 공격
    for (const attacker of team1Alive) {
      if (time >= attacker.nextAttackTime) {
        const target = selectTarget(team2States, cfg.targetingMode);
        if (!target) break;

        const result = calculateDamage(attacker, target, cfg.damageFormula, cfg.defenseFormula, cfg.armorPenetration);

        if (!result.isMiss) {
          target.currentHp = Math.max(0, target.currentHp - result.damage);
          target.damageTaken += result.damage;
          attacker.damageDealt += result.damage;
          team1TotalDamage += result.damage;

          if (target.currentHp <= 0) {
            target.alive = false;
            attacker.kills++;
          }
        }

        attacker.nextAttackTime = time + 1 / attacker.speed;
      }
    }

    // Team2 공격
    for (const attacker of team2Alive.filter(u => u.alive)) {
      if (time >= attacker.nextAttackTime) {
        const target = selectTarget(team1States, cfg.targetingMode);
        if (!target) break;

        const result = calculateDamage(attacker, target, cfg.damageFormula, cfg.defenseFormula, cfg.armorPenetration);

        if (!result.isMiss) {
          target.currentHp = Math.max(0, target.currentHp - result.damage);
          target.damageTaken += result.damage;
          attacker.damageDealt += result.damage;
          team2TotalDamage += result.damage;

          if (target.currentHp <= 0) {
            target.alive = false;
            attacker.kills++;
          }
        }

        attacker.nextAttackTime = time + 1 / attacker.speed;
      }
    }
  }

  // 결과 집계
  const team1Survivors = team1States.filter(u => u.alive).length;
  const team2Survivors = team2States.filter(u => u.alive).length;

  let winner: import('./types').TeamBattleResult['winner'];
  if (team1Survivors === 0 && team2Survivors === 0) {
    winner = 'draw';
  } else if (team1Survivors === 0) {
    winner = 'team2';
  } else if (team2Survivors === 0) {
    winner = 'team1';
  } else {
    // 시간 초과 - 생존자 수로 판정
    if (team1Survivors === team2Survivors) {
      // HP 비율 총합으로 판정
      const team1HpRatio = team1States.reduce((sum, u) => sum + (u.alive ? u.currentHp / u.maxHp : 0), 0);
      const team2HpRatio = team2States.reduce((sum, u) => sum + (u.alive ? u.currentHp / u.maxHp : 0), 0);
      winner = team1HpRatio > team2HpRatio ? 'team1' : team2HpRatio > team1HpRatio ? 'team2' : 'draw';
    } else {
      winner = team1Survivors > team2Survivors ? 'team1' : 'team2';
    }
  }

  return {
    winner,
    duration: Math.round(time * 100) / 100,
    team1Survivors,
    team2Survivors,
    team1TotalDamage,
    team2TotalDamage,
    unitResults: [
      ...team1States.map(u => ({
        unit: { id: u.id, name: u.name, hp: u.hp, maxHp: u.maxHp, atk: u.atk, def: u.def, speed: u.speed },
        team: 'team1' as const,
        survived: u.alive,
        damageDealt: u.damageDealt,
        damageTaken: u.damageTaken,
        kills: u.kills,
      })),
      ...team2States.map(u => ({
        unit: { id: u.id, name: u.name, hp: u.hp, maxHp: u.maxHp, atk: u.atk, def: u.def, speed: u.speed },
        team: 'team2' as const,
        survived: u.alive,
        damageDealt: u.damageDealt,
        damageTaken: u.damageTaken,
        kills: u.kills,
      })),
    ],
  };
}

/**
 * 몬테카를로 팀 전투 시뮬레이션
 */
export function runTeamMonteCarloSimulation(
  team1: UnitStats[],
  team2: UnitStats[],
  runs: number = 1000,
  config: Partial<import('./types').TeamBattleConfig> = {}
): {
  totalRuns: number;
  team1Wins: number;
  team2Wins: number;
  draws: number;
  team1WinRate: number;
  team2WinRate: number;
  avgDuration: number;
  avgTeam1Survivors: number;
  avgTeam2Survivors: number;
} {
  let team1Wins = 0;
  let team2Wins = 0;
  let draws = 0;
  let totalDuration = 0;
  let totalTeam1Survivors = 0;
  let totalTeam2Survivors = 0;

  for (let i = 0; i < runs; i++) {
    const result = simulateTeamBattle(team1, team2, config);

    if (result.winner === 'team1') team1Wins++;
    else if (result.winner === 'team2') team2Wins++;
    else draws++;

    totalDuration += result.duration;
    totalTeam1Survivors += result.team1Survivors;
    totalTeam2Survivors += result.team2Survivors;
  }

  return {
    totalRuns: runs,
    team1Wins,
    team2Wins,
    draws,
    team1WinRate: team1Wins / runs,
    team2WinRate: team2Wins / runs,
    avgDuration: totalDuration / runs,
    avgTeam1Survivors: totalTeam1Survivors / runs,
    avgTeam2Survivors: totalTeam2Survivors / runs,
  };
}
