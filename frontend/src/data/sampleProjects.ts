import type { Project } from '@/types';

// 샘플 프로젝트 카테고리
export type SampleCategory = 'combat' | 'economy' | 'progression' | 'gacha';

// 샘플 프로젝트 메타데이터
export interface SampleProjectMeta {
  id: string;
  nameKey: string;        // i18n 키
  descriptionKey: string; // i18n 키
  icon: string;           // lucide 아이콘명
  category: SampleCategory;
}

// 번역 함수 타입
type TranslateFunction = (key: string) => string;

// 샘플 프로젝트 (메타 + 데이터)
export interface SampleProject extends SampleProjectMeta {
  createProject: (t: TranslateFunction) => Project;  // 프로젝트 생성 함수 (번역 함수 전달)
}

// 유틸: 고유 ID 생성
const generateId = () => Math.random().toString(36).substring(2, 11);

// ============================================
// 1. RPG 캐릭터 스탯 샘플
// ============================================
const createRPGCharacterProject = (t: TranslateFunction): Project => {
  const now = Date.now();
  const sheetId = generateId();

  // 수식 정의
  const damageFormula = '=ATK*(1-DEF/200)';
  const dpsFormula = '=ATK*SPD';
  const ehpFormula = '=HP*(1+DEF/100)';

  return {
    id: generateId(),
    name: '', // i18n에서 설정
    description: '',
    createdAt: now,
    updatedAt: now,
    sheets: [
      {
        id: sheetId,
        name: 'Characters',
        createdAt: now,
        updatedAt: now,
        columns: [
          { id: 'col1', name: 'Class', type: 'general', width: 100 },
          { id: 'col2', name: 'HP', type: 'general', width: 80 },
          { id: 'col3', name: 'ATK', type: 'general', width: 80 },
          { id: 'col4', name: 'DEF', type: 'general', width: 80 },
          { id: 'col5', name: 'SPD', type: 'general', width: 80 },
          { id: 'col6', name: 'Damage', type: 'formula', width: 100, formula: damageFormula },
          { id: 'col7', name: 'DPS', type: 'formula', width: 100, formula: dpsFormula },
          { id: 'col8', name: 'EHP', type: 'formula', width: 100, formula: ehpFormula },
        ],
        rows: [
          {
            id: 'row1',
            cells: { col1: 'Warrior', col2: 1200, col3: 85, col4: 60, col5: 0.8, col6: damageFormula, col7: dpsFormula, col8: ehpFormula },
          },
          {
            id: 'row2',
            cells: { col1: 'Mage', col2: 600, col3: 120, col4: 20, col5: 1.0, col6: damageFormula, col7: dpsFormula, col8: ehpFormula },
          },
          {
            id: 'row3',
            cells: { col1: 'Archer', col2: 800, col3: 100, col4: 35, col5: 1.2, col6: damageFormula, col7: dpsFormula, col8: ehpFormula },
          },
          {
            id: 'row4',
            cells: { col1: 'Assassin', col2: 700, col3: 130, col4: 25, col5: 1.5, col6: damageFormula, col7: dpsFormula, col8: ehpFormula },
          },
          {
            id: 'row5',
            cells: { col1: 'Paladin', col2: 1500, col3: 70, col4: 80, col5: 0.6, col6: damageFormula, col7: dpsFormula, col8: ehpFormula },
          },
        ],
        stickers: [
          {
            id: generateId(),
            text: t('samples.stickers.rpgCharacter.dps'),
            color: '#FEF3C7',
            x: 75,
            y: 1,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.rpgCharacter.ehp'),
            color: '#DBEAFE',
            x: 75,
            y: 4,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.rpgCharacter.balance'),
            color: '#D1FAE5',
            x: 75,
            y: 7,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
        ],
      },
    ],
  };
};

// ============================================
// 2. 무기 밸런싱 샘플
// ============================================
const createWeaponBalanceProject = (t: TranslateFunction): Project => {
  const now = Date.now();
  const sheetId = generateId();

  // 수식 정의
  const dpsFormula = '=ATK*Speed*(1+CritRate*0.5)';
  const efficiencyFormula = '=DPS/Price*1000';

  return {
    id: generateId(),
    name: '',
    description: '',
    createdAt: now,
    updatedAt: now,
    sheets: [
      {
        id: sheetId,
        name: 'Weapons',
        createdAt: now,
        updatedAt: now,
        columns: [
          { id: 'col1', name: 'Weapon', type: 'general', width: 120 },
          { id: 'col2', name: 'ATK', type: 'general', width: 80 },
          { id: 'col3', name: 'Speed', type: 'general', width: 80 },
          { id: 'col4', name: 'CritRate', type: 'general', width: 80 },
          { id: 'col5', name: 'Price', type: 'general', width: 100 },
          { id: 'col6', name: 'DPS', type: 'formula', width: 100, formula: dpsFormula },
          { id: 'col7', name: 'Efficiency', type: 'formula', width: 100, formula: efficiencyFormula },
        ],
        rows: [
          {
            id: 'row1',
            cells: { col1: 'Iron Sword', col2: 50, col3: 1.0, col4: 0.05, col5: 100, col6: dpsFormula, col7: efficiencyFormula },
          },
          {
            id: 'row2',
            cells: { col1: 'Steel Blade', col2: 80, col3: 1.1, col4: 0.08, col5: 300, col6: dpsFormula, col7: efficiencyFormula },
          },
          {
            id: 'row3',
            cells: { col1: 'Flame Axe', col2: 120, col3: 0.7, col4: 0.15, col5: 800, col6: dpsFormula, col7: efficiencyFormula },
          },
          {
            id: 'row4',
            cells: { col1: 'Ice Dagger', col2: 45, col3: 1.8, col4: 0.25, col5: 600, col6: dpsFormula, col7: efficiencyFormula },
          },
          {
            id: 'row5',
            cells: { col1: 'Thunder Spear', col2: 100, col3: 1.2, col4: 0.12, col5: 1000, col6: dpsFormula, col7: efficiencyFormula },
          },
          {
            id: 'row6',
            cells: { col1: 'Dragon Sword', col2: 200, col3: 1.0, col4: 0.20, col5: 5000, col6: dpsFormula, col7: efficiencyFormula },
          },
        ],
        stickers: [
          {
            id: generateId(),
            text: t('samples.stickers.weaponBalance.efficiency'),
            color: '#DBEAFE',
            x: 75,
            y: 1,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.weaponBalance.crit'),
            color: '#FEF3C7',
            x: 75,
            y: 4,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.weaponBalance.balance'),
            color: '#D1FAE5',
            x: 75,
            y: 7,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
        ],
      },
    ],
  };
};

// ============================================
// 3. 레벨업 경험치 곡선 샘플
// ============================================
const createExpCurveProject = (t: TranslateFunction): Project => {
  const now = Date.now();
  const sheetId = generateId();

  // 수식 정의 - 지원되는 문법으로 수정
  // POWER 함수 사용 (POW 대신)
  const requiredExpFormula = '=ROUND(100*POWER(1.15,Level-1))';
  // 이전행 참조 사용 (범위 참조 대신)
  const totalExpFormula = '=RequiredEXP+PREV.TotalEXP';
  // 이전행 참조 사용
  const growthRateFormula = '=IF(PREV.RequiredEXP>0,RequiredEXP/PREV.RequiredEXP-1,0)';
  const playTimeFormula = '=ROUND(TotalEXP/50)';

  // 레벨 1-20 데이터 생성
  const rows = [];
  for (let i = 1; i <= 20; i++) {
    rows.push({
      id: `row${i}`,
      cells: {
        col1: i,
        col2: requiredExpFormula,
        col3: totalExpFormula,
        col4: growthRateFormula,
        col5: playTimeFormula,
      },
    });
  }

  return {
    id: generateId(),
    name: '',
    description: '',
    createdAt: now,
    updatedAt: now,
    sheets: [
      {
        id: sheetId,
        name: 'EXP Table',
        createdAt: now,
        updatedAt: now,
        columns: [
          { id: 'col1', name: 'Level', type: 'general', width: 80 },
          { id: 'col2', name: 'RequiredEXP', type: 'formula', width: 120, formula: requiredExpFormula },
          { id: 'col3', name: 'TotalEXP', type: 'formula', width: 120, formula: totalExpFormula },
          { id: 'col4', name: 'GrowthRate', type: 'formula', width: 100, formula: growthRateFormula },
          { id: 'col5', name: 'PlayTime(min)', type: 'formula', width: 120, formula: playTimeFormula },
        ],
        rows: rows,
        stickers: [
          {
            id: generateId(),
            text: t('samples.stickers.expCurve.exponential'),
            color: '#D1FAE5',
            x: 70,
            y: 1,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.expCurve.playtime'),
            color: '#FEF3C7',
            x: 70,
            y: 4,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.expCurve.tuning'),
            color: '#EDE9FE',
            x: 70,
            y: 7,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
        ],
      },
    ],
  };
};

// ============================================
// 4. 가챠 확률 계산 샘플
// ============================================
const createGachaProject = (t: TranslateFunction): Project => {
  const now = Date.now();
  const sheetId = generateId();

  // 수식 정의 - 컬럼명에 특수문자 제거하여 참조 가능하게 수정
  const expectedPullsFormula = '=IF(Pity>0,MIN(ROUND(100/Rate),Pity),ROUND(100/Rate))';
  const expectedCostFormula = '=ExpectedPulls*PullCost';
  const maxCostFormula = '=IF(Pity>0,Pity*PullCost,0)';

  return {
    id: generateId(),
    name: '',
    description: '',
    createdAt: now,
    updatedAt: now,
    sheets: [
      {
        id: sheetId,
        name: 'Gacha Rates',
        createdAt: now,
        updatedAt: now,
        columns: [
          { id: 'col1', name: 'Grade', type: 'general', width: 100 },
          { id: 'col2', name: 'Rate', type: 'general', width: 80 },
          { id: 'col3', name: 'Pity', type: 'general', width: 80 },
          { id: 'col4', name: 'PullCost', type: 'general', width: 100 },
          { id: 'col5', name: 'ExpectedPulls', type: 'formula', width: 120, formula: expectedPullsFormula },
          { id: 'col6', name: 'ExpectedCost', type: 'formula', width: 120, formula: expectedCostFormula },
          { id: 'col7', name: 'MaxCost', type: 'formula', width: 100, formula: maxCostFormula },
        ],
        rows: [
          {
            id: 'row1',
            cells: { col1: 'SSR', col2: 0.6, col3: 90, col4: 300, col5: expectedPullsFormula, col6: expectedCostFormula, col7: maxCostFormula },
          },
          {
            id: 'row2',
            cells: { col1: 'SR', col2: 5.1, col3: 0, col4: 300, col5: expectedPullsFormula, col6: expectedCostFormula, col7: maxCostFormula },
          },
          {
            id: 'row3',
            cells: { col1: 'R', col2: 25.5, col3: 0, col4: 300, col5: expectedPullsFormula, col6: expectedCostFormula, col7: maxCostFormula },
          },
          {
            id: 'row4',
            cells: { col1: 'N', col2: 68.8, col3: 0, col4: 300, col5: expectedPullsFormula, col6: expectedCostFormula, col7: maxCostFormula },
          },
        ],
        stickers: [
          {
            id: generateId(),
            text: t('samples.stickers.gachaRates.expected'),
            color: '#EDE9FE',
            x: 70,
            y: 1,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.gachaRates.pity'),
            color: '#FEF3C7',
            x: 70,
            y: 4,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
          {
            id: generateId(),
            text: t('samples.stickers.gachaRates.monetization'),
            color: '#DBEAFE',
            x: 70,
            y: 7,
            width: 220,
            height: 80,
            fontSize: 12,
            createdAt: now,
          },
        ],
      },
    ],
  };
};

// ============================================
// 샘플 프로젝트 목록
// ============================================
export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: 'rpg-character',
    nameKey: 'samples.rpgCharacter.name',
    descriptionKey: 'samples.rpgCharacter.description',
    icon: 'Swords',
    category: 'combat',
    createProject: createRPGCharacterProject,
  },
  {
    id: 'weapon-balance',
    nameKey: 'samples.weaponBalance.name',
    descriptionKey: 'samples.weaponBalance.description',
    icon: 'Shield',
    category: 'combat',
    createProject: createWeaponBalanceProject,
  },
  {
    id: 'exp-curve',
    nameKey: 'samples.expCurve.name',
    descriptionKey: 'samples.expCurve.description',
    icon: 'TrendingUp',
    category: 'progression',
    createProject: createExpCurveProject,
  },
  {
    id: 'gacha-rates',
    nameKey: 'samples.gachaRates.name',
    descriptionKey: 'samples.gachaRates.description',
    icon: 'Sparkles',
    category: 'gacha',
    createProject: createGachaProject,
  },
];

// 카테고리별 필터
export const getSamplesByCategory = (category: SampleCategory): SampleProject[] => {
  return SAMPLE_PROJECTS.filter((s) => s.category === category);
};

// ID로 샘플 찾기
export const getSampleById = (id: string): SampleProject | undefined => {
  return SAMPLE_PROJECTS.find((s) => s.id === id);
};
