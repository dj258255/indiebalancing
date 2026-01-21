import { v4 as uuidv4 } from 'uuid';
import type { Sheet, Column, Row, ColumnType } from '@/types';

// 템플릿 타입 정의
export interface SheetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  genre?: string[]; // 적합한 장르
  columns: Omit<Column, 'id'>[];
  sampleRows?: Omit<Row, 'id'>[];
  // 추가: 템플릿 사용 맥락 설명
  context?: string;
  // 추가: 핵심 지표 설명
  keyMetrics?: string[];
  // 추가: 의존하는 다른 템플릿 (시트 참조용)
  dependencies?: {
    templateId: string;
    sheetName: string; // 참조 시 사용할 시트명
    description: string; // 왜 필요한지 설명
  }[];
}

// 장르 정의
export const gameGenres = [
  { id: 'rpg', name: 'RPG', description: 'MMORPG, ARPG, JRPG, 턴제 등' },
  { id: 'action', name: '액션', description: '액션, 격투, 핵앤슬래시' },
  { id: 'fps', name: 'FPS/TPS', description: '슈팅 게임' },
  { id: 'strategy', name: '전략', description: 'RTS, 턴제 전략, 타워디펜스' },
  { id: 'idle', name: '방치형', description: '방치형, 클리커, 인크리멘탈' },
  { id: 'roguelike', name: '로그라이크', description: '로그라이크, 로그라이트' },
  { id: 'moba', name: 'MOBA/AOS', description: '멀티플레이어 배틀' },
  { id: 'card', name: '카드/덱빌딩', description: 'CCG, 덱빌더' },
  { id: 'puzzle', name: '퍼즐', description: '퍼즐, 매치3' },
  { id: 'simulation', name: '시뮬레이션', description: '경영, 육성, 타이쿤' },
];

// === 템플릿 정의 ===
export const sheetTemplates: SheetTemplate[] = [
  // ========================================
  // 1. 글로벌 설정 (앵커값 시트)
  // ========================================
  {
    id: 'global-config',
    name: '글로벌설정',
    description: '게임 전체의 기준점이 되는 상수값(앵커값). 다른 모든 시트가 이 값을 참조함.',
    category: 'config',
    genre: ['rpg', 'action', 'fps', 'strategy', 'idle', 'roguelike', 'moba', 'card'],
    context: '밸런스 조정 시 이 시트의 값만 바꾸면 전체 게임에 반영됨',
    keyMetrics: ['앵커값 = 모든 계산의 기준점', '여기서 정한 값이 게임 전체 난이도를 결정'],
    columns: [
      { name: '변수명', type: 'general' as ColumnType, width: 150 },
      { name: '값', type: 'general' as ColumnType, width: 100 },
      { name: '단위', type: 'general' as ColumnType, width: 60 },
      { name: '산출근거', type: 'general' as ColumnType, width: 300 },
      { name: '영향범위', type: 'general' as ColumnType, width: 200 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'BASE_HP',
          col1: 1000,
          col2: '',
          col3: '1레벨 플레이어가 일반몬스터에게 3~5회 피격 시 사망하도록 설계. 몬스터 ATK 250 기준, 1000/(250*0.8)≈5회',
          col4: '모든 캐릭터 HP 계산의 기준',
        },
      },
      {
        cells: {
          col0: 'BASE_ATK',
          col1: 100,
          col2: '',
          col3: '일반몬스터(HP 500)를 5~7타에 처치. 100*6=600으로 약간의 오버킬 여유',
          col4: '모든 캐릭터/무기 공격력 기준',
        },
      },
      {
        cells: {
          col0: 'BASE_DEF',
          col1: 50,
          col2: '',
          col3: '감소율 공식 적용 시 DEF 50이면 약 33% 데미지 감소 (100/(100+50))',
          col4: '모든 캐릭터/장비 방어력 기준',
        },
      },
      {
        cells: {
          col0: 'TTK_TARGET',
          col1: 5,
          col2: '초',
          col3: 'RPG 장르 권장 TTK 5~30초 중 액션성 강조하여 하한선 채택',
          col4: 'DPS, 적 HP 설계 기준',
        },
      },
      {
        cells: {
          col0: 'GROWTH_RATE',
          col1: 1.08,
          col2: 'x/레벨',
          col3: '지수 성장률 1.05~1.15 중간값. 50레벨 시 약 47배 성장',
          col4: '레벨업 시 스탯 증가 계수',
        },
      },
      {
        cells: {
          col0: 'CRIT_RATE_BASE',
          col1: 0.05,
          col2: '%',
          col3: '기본 5%. 장비/버프로 최대 50% 도달 설계',
          col4: '치명타 확률 기준',
        },
      },
      {
        cells: {
          col0: 'CRIT_DMG_BASE',
          col1: 1.5,
          col2: 'x',
          col3: '기본 150%. 특화 빌드 시 200~250% 도달 설계',
          col4: '치명타 데미지 배율 기준',
        },
      },
      {
        cells: {
          col0: 'DEF_CAP',
          col1: 0.7,
          col2: '%',
          col3: '최대 70% 데미지 감소. 탱커도 무적이 아니게 상한선 설정',
          col4: '방어력 감소율 상한',
        },
      },
    ],
  },

  // ========================================
  // 2. RPG 캐릭터 스탯
  // ========================================
  {
    id: 'rpg-character',
    name: '[RPG] 캐릭터 스탯',
    description: '캐릭터별 기본 능력치와 역할에 따른 스탯 배분',
    category: 'character',
    genre: ['rpg'],
    context: '글로벌설정 시트의 BASE_HP, BASE_ATK, BASE_DEF를 참조하여 역할별 배율 적용',
    keyMetrics: [
      '탱커: 기준 대비 HP×1.5, DEF×3.0, ATK×0.8',
      '딜러: 기준 대비 ATK×2.0, HP×0.7, CritRate×5',
      '힐러: 기준값 유지, 힐량은 스킬 배율로 별도 조정',
    ],
    dependencies: [
      {
        templateId: 'global-config',
        sheetName: '글로벌설정',
        description: 'BASE_HP, BASE_ATK, BASE_DEF 값 참조',
      },
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '이름', type: 'general' as ColumnType, width: 100 },
      { name: '등급', type: 'general' as ColumnType, width: 60 },
      { name: '역할', type: 'general' as ColumnType, width: 70 },
      { name: 'HP배율', type: 'general' as ColumnType, width: 70 },
      { name: 'HP', type: 'formula' as ColumnType, width: 90 },
      { name: 'ATK배율', type: 'general' as ColumnType, width: 75 },
      { name: 'ATK', type: 'formula' as ColumnType, width: 90 },
      { name: 'DEF배율', type: 'general' as ColumnType, width: 75 },
      { name: 'DEF', type: 'formula' as ColumnType, width: 90 },
      { name: 'CritRate', type: 'general' as ColumnType, width: 75 },
      { name: 'CritDMG', type: 'general' as ColumnType, width: 75 },
      { name: 'EHP', type: 'formula' as ColumnType, width: 90 },
      { name: 'DPS', type: 'formula' as ColumnType, width: 90 },
      { name: '설계의도', type: 'general' as ColumnType, width: 280 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'CHAR_001',
          col1: '철갑 기사',
          col2: 'SSR',
          col3: '탱커',
          col4: 1.5,
          col5: '=글로벌설정.BASE_HP*HP배율',
          col6: 0.8,
          col7: '=글로벌설정.BASE_ATK*ATK배율',
          col8: 3.0,
          col9: '=글로벌설정.BASE_DEF*DEF배율',
          col10: 0.05,
          col11: 1.5,
          col12: '=HP*(1+DEF/100)',
          col13: '=ATK*(1+CritRate*(CritDMG-1))',
          col14: 'HP=BASE×1.5, DEF=BASE×3 → EHP=HP×(1+DEF/100). DPS=ATK×(1+Crit×(CritDMG-1))',
        },
      },
      {
        cells: {
          col0: 'CHAR_002',
          col1: '암살자',
          col2: 'SSR',
          col3: '딜러',
          col4: 0.7,
          col5: '=글로벌설정.BASE_HP*HP배율',
          col6: 2.0,
          col7: '=글로벌설정.BASE_ATK*ATK배율',
          col8: 0.8,
          col9: '=글로벌설정.BASE_DEF*DEF배율',
          col10: 0.25,
          col11: 2.0,
          col12: '=HP*(1+DEF/100)',
          col13: '=ATK*(1+CritRate*(CritDMG-1))',
          col14: 'HP 낮음, DEF 낮음 → EHP 낮음. ATK 높음, Crit 25%×2배 → 고위험 고화력',
        },
      },
      {
        cells: {
          col0: 'CHAR_003',
          col1: '사제',
          col2: 'SR',
          col3: '힐러',
          col4: 1.0,
          col5: '=글로벌설정.BASE_HP*HP배율',
          col6: 0.6,
          col7: '=글로벌설정.BASE_ATK*ATK배율',
          col8: 1.4,
          col9: '=글로벌설정.BASE_DEF*DEF배율',
          col10: 0.1,
          col11: 1.5,
          col12: '=HP*(1+DEF/100)',
          col13: '=ATK*(1+CritRate*(CritDMG-1))',
          col14: '중간 생존력. 힐량=ATK×스킬배율로 별도 계산',
        },
      },
      {
        cells: {
          col0: 'CHAR_004',
          col1: '마법사',
          col2: 'SR',
          col3: '딜러',
          col4: 0.8,
          col5: '=글로벌설정.BASE_HP*HP배율',
          col6: 1.5,
          col7: '=글로벌설정.BASE_ATK*ATK배율',
          col8: 0.9,
          col9: '=글로벌설정.BASE_DEF*DEF배율',
          col10: 0.15,
          col11: 1.8,
          col12: '=HP*(1+DEF/100)',
          col13: '=ATK*(1+CritRate*(CritDMG-1))',
          col14: '암살자 대비 낮은 DPS지만 범위기로 총 딜 보상',
        },
      },
    ],
  },

  // ========================================
  // 3. 레벨/경험치 테이블
  // ========================================
  {
    id: 'rpg-level-exp',
    name: '[RPG] 레벨/경험치 테이블',
    description: '레벨업 필요 경험치와 스탯 성장. 글로벌 설정 참조.',
    category: 'progression',
    genre: ['rpg', 'idle'],
    context: '기본 EXP=일반몹 10마리 처치(10×10=100). 글로벌설정의 GROWTH_RATE(1.08) 적용',
    keyMetrics: [
      'EXP 증가율 1.5: 레벨당 50% 더 많은 경험치 필요',
      '스탯 성장률 1.08: 글로벌설정 참조. 50렙 시 기준 대비 47배',
      '목표 플레이타임: 2렙(10분) → 10렙(3시간) → 30렙(3일) → 50렙(2주)',
    ],
    dependencies: [
      {
        templateId: 'global-config',
        sheetName: '글로벌설정',
        description: 'BASE_HP, BASE_ATK, GROWTH_RATE 값 참조',
      },
    ],
    columns: [
      { name: '레벨', type: 'general' as ColumnType, width: 60 },
      { name: 'EXP기준', type: 'general' as ColumnType, width: 80 },
      { name: 'EXP증가율', type: 'general' as ColumnType, width: 85 },
      { name: '필요EXP', type: 'formula' as ColumnType, width: 100 },
      { name: '누적EXP', type: 'formula' as ColumnType, width: 100 },
      { name: '성장률', type: 'general' as ColumnType, width: 70 },
      { name: 'HP', type: 'formula' as ColumnType, width: 100 },
      { name: 'ATK', type: 'formula' as ColumnType, width: 100 },
      { name: '예상도달시간', type: 'general' as ColumnType, width: 110 },
      { name: '설계의도', type: 'general' as ColumnType, width: 280 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 1,
          col1: 100,
          col2: 1.5,
          col3: 0,
          col4: 0,
          col5: 1.08,
          col6: '=글로벌설정.BASE_HP',
          col7: '=글로벌설정.BASE_ATK',
          col8: '시작',
          col9: 'EXP기준 100 = 일반몹(EXP 10) 10마리. 튜토리얼에서 즉시 달성 가능',
        },
      },
      {
        cells: {
          col0: 2,
          col1: 100,
          col2: 1.5,
          col3: '=EXP기준*POWER(EXP증가율, 레벨-2)',
          col4: '=이전행.누적EXP+필요EXP',
          col5: 1.08,
          col6: '=글로벌설정.BASE_HP*POWER(성장률, 레벨-1)',
          col7: '=글로벌설정.BASE_ATK*POWER(성장률, 레벨-1)',
          col8: '10분',
          col9: '필요EXP 100. 일반몹 10마리=50초(5초×10). 이동/대기 포함 10분',
        },
      },
      {
        cells: {
          col0: 10,
          col1: 100,
          col2: 1.5,
          col3: '=EXP기준*POWER(EXP증가율, 레벨-2)',
          col4: '=이전행.누적EXP+필요EXP',
          col5: 1.08,
          col6: '=글로벌설정.BASE_HP*POWER(성장률, 레벨-1)',
          col7: '=글로벌설정.BASE_ATK*POWER(성장률, 레벨-1)',
          col8: '3시간',
          col9: '필요EXP 3,844. 누적 7,600. HP 1,999, ATK 200. 초반 구간 종료',
        },
      },
      {
        cells: {
          col0: 30,
          col1: 100,
          col2: 1.5,
          col3: '=EXP기준*POWER(EXP증가율, 레벨-2)',
          col4: '=이전행.누적EXP+필요EXP',
          col5: 1.08,
          col6: '=글로벌설정.BASE_HP*POWER(성장률, 레벨-1)',
          col7: '=글로벌설정.BASE_ATK*POWER(성장률, 레벨-1)',
          col8: '3일',
          col9: '필요EXP 191만. 누적 380만. HP 9,317, ATK 932. 중반 콘텐츠 벽',
        },
      },
      {
        cells: {
          col0: 50,
          col1: 100,
          col2: 1.5,
          col3: '=EXP기준*POWER(EXP증가율, 레벨-2)',
          col4: '=이전행.누적EXP+필요EXP',
          col5: 1.08,
          col6: '=글로벌설정.BASE_HP*POWER(성장률, 레벨-1)',
          col7: '=글로벌설정.BASE_ATK*POWER(성장률, 레벨-1)',
          col8: '2주',
          col9: '필요EXP 4.3억. 누적 8.6억. HP 43,427, ATK 4,343. 엔드콘텐츠 입장',
        },
      },
    ],
  },

  // ========================================
  // 4. 스킬 데이터
  // ========================================
  {
    id: 'rpg-skill',
    name: '[RPG] 스킬 데이터',
    description: '스킬 배율과 쿨타임 설계. DPS 균형을 위한 배율/쿨타임 트레이드오프.',
    category: 'skill',
    genre: ['rpg', 'action', 'moba'],
    context: '스킬 DPS ≈ 평타 DPS × 1.3 유지. 스킬이 강하되 평타도 의미있게',
    keyMetrics: [
      '기대 DPS = 배율 × (1/쿨타임)',
      '강한 스킬 = 높은 배율 + 긴 쿨타임',
      '유틸 스킬 = 낮은 배율 + 짧은 쿨타임 + CC효과',
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '스킬명', type: 'general' as ColumnType, width: 110 },
      { name: '타입', type: 'general' as ColumnType, width: 70 },
      { name: '배율(%)', type: 'general' as ColumnType, width: 75 },
      { name: '쿨타임(s)', type: 'general' as ColumnType, width: 80 },
      { name: '마나', type: 'general' as ColumnType, width: 60 },
      { name: '대상수', type: 'general' as ColumnType, width: 65 },
      { name: '스킬DPS', type: 'formula' as ColumnType, width: 90 },
      { name: '효과', type: 'general' as ColumnType, width: 120 },
      { name: '설계의도', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'SKL_001',
          col1: '강타',
          col2: '액티브',
          col3: 200,
          col4: 6,
          col5: 20,
          col6: 1,
          col7: '=배율(%)/100/쿨타임(s)',
          col8: '없음',
          col9: 'DPS 0.33. 평타(DPS 1.0)의 33% 추가딜. 단일 대상 주력기',
        },
      },
      {
        cells: {
          col0: 'SKL_002',
          col1: '회오리베기',
          col2: '액티브',
          col3: 120,
          col4: 10,
          col5: 40,
          col6: 5,
          col7: '=배율(%)/100/쿨타임(s)*대상수',
          col8: '없음',
          col9: 'DPS 0.12×5=0.6. 다중 타겟으로 단일기보다 총 딜 높음',
        },
      },
      {
        cells: {
          col0: 'SKL_003',
          col1: '궁극기',
          col2: '궁극',
          col3: 500,
          col4: 60,
          col5: 100,
          col6: 3,
          col7: '=배율(%)/100/쿨타임(s)*대상수',
          col8: '기절 2초',
          col9: 'DPS 0.25. 60초 쿨이지만 전투당 1회로 결정적 순간용',
        },
      },
      {
        cells: {
          col0: 'SKL_004',
          col1: '도발',
          col2: '유틸',
          col3: 0,
          col4: 15,
          col5: 30,
          col6: 0,
          col7: 0,
          col8: '어그로 5초',
          col9: '딜 없음. 탱커 필수 유틸. 어그로 지속시간/쿨타임 비율 33%',
        },
      },
    ],
  },

  // ========================================
  // 5. 장비 데이터
  // ========================================
  {
    id: 'rpg-equipment',
    name: '[RPG] 장비 스탯',
    description: '장비 등급별 스탯 설계. 기준값 = BASE_ATK의 30%(무기), BASE_DEF의 80%(방어구)',
    category: 'equipment',
    genre: ['rpg', 'action'],
    context: '장비 1개 = 기본 스탯의 30~50% 증가 목표. 6슬롯 풀장비 시 기본 대비 2배',
    keyMetrics: [
      '등급 배율: C(1.0) → B(1.5) → A(2.25) → S(3.4) → SS(5.0). 등급당 1.5배',
      '무기 기준값 30 = BASE_ATK(100)의 30%. 6슬롯 C급 풀장비 시 ATK +180(180%)',
      'SS급 1개(150) ≈ C급 5개(150). 획득 난이도로 밸런스',
    ],
    dependencies: [
      {
        templateId: 'global-config',
        sheetName: '글로벌설정',
        description: '기준값 산출에 BASE_ATK, BASE_DEF 참조',
      },
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '이름', type: 'general' as ColumnType, width: 110 },
      { name: '타입', type: 'general' as ColumnType, width: 65 },
      { name: '등급', type: 'general' as ColumnType, width: 50 },
      { name: '등급배율', type: 'general' as ColumnType, width: 75 },
      { name: '기준값', type: 'general' as ColumnType, width: 70 },
      { name: '기준값근거', type: 'general' as ColumnType, width: 150 },
      { name: '주스탯', type: 'general' as ColumnType, width: 65 },
      { name: '주스탯값', type: 'formula' as ColumnType, width: 90 },
      { name: '부스탯', type: 'general' as ColumnType, width: 65 },
      { name: '부스탯값', type: 'formula' as ColumnType, width: 90 },
      { name: '설계의도', type: 'general' as ColumnType, width: 280 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'EQP_001',
          col1: '낡은 검',
          col2: '무기',
          col3: 'C',
          col4: 1.0,
          col5: 30,
          col6: 'BASE_ATK(100)×0.3',
          col7: 'ATK',
          col8: '=기준값*등급배율',
          col9: '',
          col10: 0,
          col11: '초반 장비. ATK 30으로 캐릭터 공격력 30% 증가. 부스탯 없음',
        },
      },
      {
        cells: {
          col0: 'EQP_002',
          col1: '강철검',
          col2: '무기',
          col3: 'B',
          col4: 1.5,
          col5: 30,
          col6: 'BASE_ATK(100)×0.3',
          col7: 'ATK',
          col8: '=기준값*등급배율',
          col9: 'CritRate',
          col10: '=0.03*등급배율',
          col11: 'ATK 45(+50%), CritRate 4.5%. C급 대비 체감 상승. 빌드 분화 시작',
        },
      },
      {
        cells: {
          col0: 'EQP_003',
          col1: '미스릴 갑옷',
          col2: '갑옷',
          col3: 'A',
          col4: 2.25,
          col5: 40,
          col6: 'BASE_DEF(50)×0.8',
          col7: 'DEF',
          col8: '=기준값*등급배율',
          col9: 'HP',
          col10: '=100*등급배율',
          col11: 'DEF 90, HP 225. 탱커 EHP 3750→5800(+55%). 생존력 대폭 상승',
        },
      },
      {
        cells: {
          col0: 'EQP_004',
          col1: '전설의 검',
          col2: '무기',
          col3: 'SS',
          col4: 5.0,
          col5: 30,
          col6: 'BASE_ATK(100)×0.3',
          col7: 'ATK',
          col8: '=기준값*등급배율',
          col9: 'CritDMG',
          col10: '=0.2*등급배율',
          col11: 'ATK 150(C급의 5배), CritDMG +100%. 드랍율 0.1%로 희소성 밸런스',
        },
      },
    ],
  },

  // ========================================
  // 6. 몬스터/적 데이터
  // ========================================
  {
    id: 'rpg-monster',
    name: '[RPG] 몬스터 데이터',
    description: '몬스터 스탯과 보상. 플레이어 레벨 기준 상대적 난이도 설계.',
    category: 'enemy',
    genre: ['rpg', 'action', 'roguelike'],
    context: '동레벨 플레이어 기준 TTK 5초, 피격 5회 사망 목표',
    keyMetrics: [
      '일반: 플레이어의 50% 스탯. EXP 10(2렙까지 10마리=100EXP)',
      '엘리트: 플레이어의 150% 스탯. EXP 50(일반의 5배, TTK 5배)',
      '보스: 플레이어의 500% HP. EXP 500(일반의 50배, 주간 1회 가치)',
    ],
    dependencies: [
      {
        templateId: 'global-config',
        sheetName: '글로벌설정',
        description: 'BASE_HP, BASE_ATK, GROWTH_RATE 값 참조',
      },
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '이름', type: 'general' as ColumnType, width: 100 },
      { name: '타입', type: 'general' as ColumnType, width: 60 },
      { name: '레벨', type: 'general' as ColumnType, width: 55 },
      { name: 'HP배율', type: 'general' as ColumnType, width: 70 },
      { name: 'HP', type: 'formula' as ColumnType, width: 100 },
      { name: 'ATK배율', type: 'general' as ColumnType, width: 75 },
      { name: 'ATK', type: 'formula' as ColumnType, width: 90 },
      { name: 'DEF', type: 'formula' as ColumnType, width: 80 },
      { name: 'EXP기준', type: 'general' as ColumnType, width: 75 },
      { name: 'EXP', type: 'formula' as ColumnType, width: 90 },
      { name: '골드기준', type: 'general' as ColumnType, width: 75 },
      { name: '골드', type: 'formula' as ColumnType, width: 90 },
      { name: 'TTK목표', type: 'general' as ColumnType, width: 70 },
      { name: '설계의도', type: 'general' as ColumnType, width: 280 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'MON_001',
          col1: '슬라임',
          col2: '일반',
          col3: 1,
          col4: 0.5,
          col5: '=글로벌설정.BASE_HP*HP배율*POWER(1.08,레벨-1)',
          col6: 0.5,
          col7: '=글로벌설정.BASE_ATK*ATK배율*POWER(1.08,레벨-1)',
          col8: '=SCALE(20, 레벨, 1.08, "exponential")',
          col9: 10,
          col10: '=EXP기준*POWER(1.08,레벨-1)',
          col11: 5,
          col12: '=골드기준*POWER(1.08,레벨-1)',
          col13: 3,
          col14: 'HP 500(BASE×0.5). EXP 10: 2렙필요EXP 100÷10=10마리. 50초 내 레벨업',
        },
      },
      {
        cells: {
          col0: 'MON_002',
          col1: '고블린 워리어',
          col2: '일반',
          col3: 5,
          col4: 0.5,
          col5: '=글로벌설정.BASE_HP*HP배율*POWER(1.08,레벨-1)',
          col6: 0.5,
          col7: '=글로벌설정.BASE_ATK*ATK배율*POWER(1.08,레벨-1)',
          col8: '=SCALE(20, 레벨, 1.08, "exponential")',
          col9: 10,
          col10: '=EXP기준*POWER(1.08,레벨-1)',
          col11: 5,
          col12: '=골드기준*POWER(1.08,레벨-1)',
          col13: 4,
          col14: '5렙 일반몹. HP 680(500×1.08^4). EXP 14(10×1.08^4). 레벨 스케일링 적용',
        },
      },
      {
        cells: {
          col0: 'MON_003',
          col1: '오크 대장',
          col2: '엘리트',
          col3: 5,
          col4: 1.5,
          col5: '=글로벌설정.BASE_HP*HP배율*POWER(1.08,레벨-1)',
          col6: 1.5,
          col7: '=글로벌설정.BASE_ATK*ATK배율*POWER(1.08,레벨-1)',
          col8: '=SCALE(60, 레벨, 1.08, "exponential")',
          col9: 50,
          col10: '=EXP기준*POWER(1.08,레벨-1)',
          col11: 30,
          col12: '=골드기준*POWER(1.08,레벨-1)',
          col13: 15,
          col14: 'HP 2040(BASE×1.5×1.08^4). EXP 50: 일반 5배. TTK 15초÷5초=3배 시간, 5배 보상으로 효율 유도',
        },
      },
      {
        cells: {
          col0: 'MON_004',
          col1: '드래곤',
          col2: '보스',
          col3: 10,
          col4: 5.0,
          col5: '=글로벌설정.BASE_HP*HP배율*POWER(1.08,레벨-1)',
          col6: 2.0,
          col7: '=글로벌설정.BASE_ATK*ATK배율*POWER(1.08,레벨-1)',
          col8: '=SCALE(100, 레벨, 1.08, "exponential")',
          col9: 500,
          col10: '=EXP기준*POWER(1.08,레벨-1)',
          col11: 300,
          col12: '=골드기준*POWER(1.08,레벨-1)',
          col13: 60,
          col14: 'HP 10,795(BASE×5×1.08^9). EXP 500: 일반 50배. 1분 보스전, 4인파티(DPS×4) 기준 TTK 15초',
        },
      },
    ],
  },

  // ========================================
  // 7. FPS 무기 데이터
  // ========================================
  {
    id: 'fps-weapon',
    name: '[FPS] 무기 스탯',
    description: 'FPS 무기 밸런스. TTK 기준으로 DPS와 정확도 트레이드오프.',
    category: 'equipment',
    genre: ['fps'],
    context: 'TTK 0.3~1.5초 권장. 무기별 역할 구분 명확히',
    keyMetrics: [
      '이론 TTK = 적HP / DPS',
      '실제 TTK = 이론TTK / 명중률',
      'DPS = 데미지 × (RPM/60)',
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '무기명', type: 'general' as ColumnType, width: 110 },
      { name: '타입', type: 'general' as ColumnType, width: 80 },
      { name: '데미지', type: 'general' as ColumnType, width: 70 },
      { name: 'RPM', type: 'general' as ColumnType, width: 65 },
      { name: '탄창', type: 'general' as ColumnType, width: 55 },
      { name: '재장전(s)', type: 'general' as ColumnType, width: 80 },
      { name: 'DPS', type: 'formula' as ColumnType, width: 80 },
      { name: 'TTK(100HP)', type: 'formula' as ColumnType, width: 100 },
      { name: '역할', type: 'general' as ColumnType, width: 100 },
      { name: '설계의도', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'WPN_001',
          col1: 'M4A1',
          col2: '돌격소총',
          col3: 28,
          col4: 700,
          col5: 30,
          col6: 2.5,
          col7: '=데미지*RPM/60',
          col8: '=100/DPS',
          col9: '범용',
          col10: 'DPS 327, TTK 0.31초. 모든 거리에서 안정적. 기준 무기',
        },
      },
      {
        cells: {
          col0: 'WPN_002',
          col1: 'AK-47',
          col2: '돌격소총',
          col3: 35,
          col4: 600,
          col5: 30,
          col6: 2.7,
          col7: '=데미지*RPM/60',
          col8: '=100/DPS',
          col9: '고데미지',
          col10: 'DPS 350, TTK 0.29초. M4 대비 높은 반동. 리스크-리워드',
        },
      },
      {
        cells: {
          col0: 'WPN_003',
          col1: 'AWP',
          col2: '저격소총',
          col3: 115,
          col4: 41,
          col5: 5,
          col6: 3.5,
          col7: '=데미지*RPM/60',
          col8: '=100/DPS',
          col9: '원샷원킬',
          col10: 'DPS 79. 낮은 DPS지만 115 데미지로 헤드샷 원킬. 고스킬 무기',
        },
      },
      {
        cells: {
          col0: 'WPN_004',
          col1: 'MP5',
          col2: 'SMG',
          col3: 22,
          col4: 800,
          col5: 30,
          col6: 2.0,
          col7: '=데미지*RPM/60',
          col8: '=100/DPS',
          col9: '근접전',
          col10: 'DPS 293, TTK 0.34초. 낮은 데미지 but 빠른 연사. 근거리 특화',
        },
      },
    ],
  },

  // ========================================
  // 8. 방치형 업그레이드
  // ========================================
  {
    id: 'idle-upgrade',
    name: '[방치형] 업그레이드 테이블',
    description: '업그레이드 비용과 효과. 비용 증가율 vs 효과 증가율 밸런스.',
    category: 'progression',
    genre: ['idle'],
    context: '비용 증가율 > 효과 증가율 → 한계효용 체감. 다양한 업그레이드 분산 유도',
    keyMetrics: [
      '기준 클릭데미지 1 = 1렙몹 HP 10의 10%. 10클릭에 처치',
      '비용 증가율 1.15: 10레벨 비용 = 1레벨의 4배 (1.15^9=3.5)',
      '효율 체감: 10레벨 효율 = 1레벨의 25% → 다른 업그레이드로 분산 유도',
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '업그레이드명', type: 'general' as ColumnType, width: 120 },
      { name: '레벨', type: 'general' as ColumnType, width: 55 },
      { name: '효과기준', type: 'general' as ColumnType, width: 75 },
      { name: '효과', type: 'formula' as ColumnType, width: 100 },
      { name: '효과단위', type: 'general' as ColumnType, width: 90 },
      { name: '비용기준', type: 'general' as ColumnType, width: 75 },
      { name: '비용증가율', type: 'general' as ColumnType, width: 85 },
      { name: '비용', type: 'formula' as ColumnType, width: 100 },
      { name: '효율', type: 'formula' as ColumnType, width: 90 },
      { name: '설계의도', type: 'general' as ColumnType, width: 280 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'UPG_001',
          col1: '클릭 데미지',
          col2: 1,
          col3: 1,
          col4: '=효과기준*레벨',
          col5: '+N 데미지/클릭',
          col6: 10,
          col7: 1.15,
          col8: '=비용기준*POWER(비용증가율, 레벨-1)',
          col9: '=효과/비용',
          col10: '효과1, 비용10 → 효율0.1. 10클릭=10데미지=1렙몹처치',
        },
      },
      {
        cells: {
          col0: 'UPG_001',
          col1: '클릭 데미지',
          col2: 10,
          col3: 1,
          col4: '=효과기준*레벨',
          col5: '+N 데미지/클릭',
          col6: 10,
          col7: 1.15,
          col8: '=비용기준*POWER(비용증가율, 레벨-1)',
          col9: '=효과/비용',
          col10: '효과10, 비용35 → 효율0.29. 1렙대비 효율29%로 체감',
        },
      },
      {
        cells: {
          col0: 'UPG_002',
          col1: '자동 공격',
          col2: 1,
          col3: 0.1,
          col4: '=효과기준*레벨',
          col5: '+N DPS (초당)',
          col6: 100,
          col7: 1.15,
          col8: '=비용기준*POWER(비용증가율, 레벨-1)',
          col9: '=효과/비용',
          col10: '초당0.1데미지. 클릭10배비용으로 방치플레이 전환. 10렙시 1DPS',
        },
      },
      {
        cells: {
          col0: 'UPG_003',
          col1: '크리티컬 확률',
          col2: 1,
          col3: 0.01,
          col4: '=효과기준*레벨',
          col5: '+N% 크리확률',
          col6: 500,
          col7: 1.15,
          col8: '=비용기준*POWER(비용증가율, 레벨-1)',
          col9: '=효과/비용',
          col10: '1렙당 1%확률. 50렙시 50%확률. 고비용 후반 업그레이드',
        },
      },
    ],
  },

  // ========================================
  // 9. 가챠/뽑기 확률 테이블
  // ========================================
  {
    id: 'gacha-pool',
    name: '가챠 확률 설계',
    description: '등급별 확률과 천장 시스템. 기대값 기반 수익 설계.',
    category: 'gacha',
    genre: ['rpg', 'idle', 'card'],
    context: '최고 등급 1개 획득까지 기대 비용 $50~100 권장 (업계 표준)',
    keyMetrics: [
      '기본 확률 → 기대 뽑수 = 1/확률',
      '천장 적용 시 실제 기대 뽑수 감소',
      '픽업 확률 = 등급 확률 × 픽업 비율',
    ],
    columns: [
      { name: '등급', type: 'general' as ColumnType, width: 70 },
      { name: '기본확률(%)', type: 'general' as ColumnType, width: 95 },
      { name: '기대뽑수', type: 'formula' as ColumnType, width: 90 },
      { name: '소프트천장', type: 'general' as ColumnType, width: 90 },
      { name: '하드천장', type: 'general' as ColumnType, width: 85 },
      { name: '천장증가율', type: 'general' as ColumnType, width: 90 },
      { name: '실제기대뽑수', type: 'general' as ColumnType, width: 100 },
      { name: '1뽑당비용', type: 'general' as ColumnType, width: 90 },
      { name: '획득비용', type: 'formula' as ColumnType, width: 90 },
      { name: '설계의도', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'SSR',
          col1: 0.6,
          col2: '=100/기본확률(%)',
          col3: 74,
          col4: 90,
          col5: 6.0,
          col6: 62,
          col7: 1.5,
          col8: '=실제기대뽑수*1뽑당비용',
          col9: '기대 167뽑이지만 천장으로 62뽑. 획득비용 $93',
        },
      },
      {
        cells: {
          col0: 'SR',
          col1: 5.1,
          col2: '=100/기본확률(%)',
          col3: 0,
          col4: 10,
          col5: 0,
          col6: 10,
          col7: 1.5,
          col8: '=실제기대뽑수*1뽑당비용',
          col9: '기대 20뽑. 하드천장 10으로 보장. 획득비용 $15',
        },
      },
      {
        cells: {
          col0: 'R',
          col1: 25.5,
          col2: '=100/기본확률(%)',
          col3: 0,
          col4: 0,
          col5: 0,
          col6: 4,
          col7: 1.5,
          col8: '=실제기대뽑수*1뽑당비용',
          col9: '기대 4뽑. 천장 없이도 충분히 획득. 볼륨 역할',
        },
      },
    ],
  },

  // ========================================
  // 10. 경제 시스템 - Faucet/Sink
  // ========================================
  {
    id: 'economy-faucet-sink',
    name: '경제 Faucet/Sink 분석',
    description: '재화 유입(Faucet)과 유출(Sink) 밸런스. 인플레이션 제어.',
    category: 'economy',
    genre: ['rpg', 'idle', 'moba', 'strategy'],
    context: 'Faucet:Sink = 1:0.7~0.9 권장. 약간의 잉여로 성장감, 과잉은 인플레',
    keyMetrics: [
      '총 Faucet = 45,000 (퀘10K+파밍30K+출석5K)',
      '총 Sink = 35,000 (강화25K+상점10K)',
      '일일 순수익 = 10,000 (저축률 22%)',
    ],
    columns: [
      { name: '항목', type: 'general' as ColumnType, width: 130 },
      { name: 'F/S', type: 'general' as ColumnType, width: 50 },
      { name: '재화', type: 'general' as ColumnType, width: 70 },
      { name: '일일량', type: 'general' as ColumnType, width: 90 },
      { name: '주간량', type: 'formula' as ColumnType, width: 90 },
      { name: '총Faucet', type: 'general' as ColumnType, width: 85 },
      { name: '비율(%)', type: 'formula' as ColumnType, width: 100 },
      { name: '가정조건', type: 'general' as ColumnType, width: 150 },
      { name: '설계의도', type: 'general' as ColumnType, width: 200 },
    ],
    sampleRows: [
      {
        cells: {
          col0: '일일퀘스트',
          col1: 'F',
          col2: '골드',
          col3: 10000,
          col4: '=일일량*7',
          col5: 45000,
          col6: '=일일량/총Faucet*100',
          col7: '매일 완료 가정',
          col8: 'Faucet의 22%. 기본 수입원',
        },
      },
      {
        cells: {
          col0: '스테이지 파밍',
          col1: 'F',
          col2: '골드',
          col3: 30000,
          col4: '=일일량*7',
          col5: 45000,
          col6: '=일일량/총Faucet*100',
          col7: '1시간 플레이 기준',
          col8: 'Faucet의 67%. 플레이 보상 핵심',
        },
      },
      {
        cells: {
          col0: '출석 보너스',
          col1: 'F',
          col2: '골드',
          col3: 5000,
          col4: '=일일량*7',
          col5: 45000,
          col6: '=일일량/총Faucet*100',
          col7: '매일 접속',
          col8: 'Faucet의 11%. 무조건 획득',
        },
      },
      {
        cells: {
          col0: '장비 강화',
          col1: 'S',
          col2: '골드',
          col3: -25000,
          col4: '=일일량*7',
          col5: 45000,
          col6: '=ABS(일일량)/총Faucet*100',
          col7: '일 평균 5회 강화',
          col8: 'Faucet의 56% 소비. 주력 Sink',
        },
      },
      {
        cells: {
          col0: '상점 구매',
          col1: 'S',
          col2: '골드',
          col3: -10000,
          col4: '=일일량*7',
          col5: 45000,
          col6: '=ABS(일일량)/총Faucet*100',
          col7: '일일 상점 한정 구매',
          col8: 'Faucet의 22% 소비. 지출 유도',
        },
      },
      {
        cells: {
          col0: '순수익',
          col1: '-',
          col2: '골드',
          col3: 10000,
          col4: '=일일량*7',
          col5: 45000,
          col6: '=일일량/총Faucet*100',
          col7: 'Faucet-Sink',
          col8: '저축률 22%(10K/45K). 목표 10~30% 내',
        },
      },
    ],
  },

  // ========================================
  // 11. 스테이지/웨이브 구성
  // ========================================
  {
    id: 'td-wave',
    name: '[TD/로그라이크] 웨이브 구성',
    description: '웨이브별 난이도 스케일링. 플로우 이론 기반 난이도 곡선.',
    category: 'stage',
    genre: ['strategy', 'idle', 'roguelike'],
    context: '웨이브당 5~15% 난이도 증가. 10웨이브마다 보스로 긴장감',
    keyMetrics: [
      '난이도 = HP배율 × 수량',
      '보스 웨이브 = 일반의 5배 난이도',
      '휴식 구간(상점) = 10웨이브마다',
    ],
    dependencies: [
      {
        templateId: 'rpg-monster',
        sheetName: '몬스터',
        description: '적ID 참조 (ENM_001, ENM_BOSS 등)',
      },
    ],
    columns: [
      { name: '웨이브', type: 'general' as ColumnType, width: 65 },
      { name: '타입', type: 'general' as ColumnType, width: 70 },
      { name: '적ID', type: 'general' as ColumnType, width: 80 },
      { name: '수량', type: 'formula' as ColumnType, width: 70 },
      { name: 'HP배율', type: 'formula' as ColumnType, width: 80 },
      { name: '난이도지수', type: 'formula' as ColumnType, width: 95 },
      { name: '보상골드', type: 'formula' as ColumnType, width: 90 },
      { name: '설계의도', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 1,
          col1: '일반',
          col2: 'ENM_001',
          col3: 5,
          col4: 1.0,
          col5: '=수량*HP배율',
          col6: 50,
          col7: '난이도 5. 워밍업. 시스템 이해',
        },
      },
      {
        cells: {
          col0: 5,
          col1: '일반',
          col2: 'ENM_001',
          col3: '=SCALE(5, 웨이브, 1.1, "exponential")',
          col4: '=SCALE(1, 웨이브, 1.05, "exponential")',
          col5: '=수량*HP배율',
          col6: '=SCALE(50, 웨이브, 1.1, "exponential")',
          col7: '난이도 10. 수량+HP 동시 스케일링',
        },
      },
      {
        cells: {
          col0: 10,
          col1: '보스',
          col2: 'ENM_BOSS',
          col3: 1,
          col4: '=SCALE(5, 웨이브/10, 1.5, "exponential")',
          col5: '=수량*HP배율',
          col6: '=SCALE(500, 웨이브, 1.15, "exponential")',
          col7: '첫 보스. 난이도 급상승. 패턴 학습 요구',
        },
      },
      {
        cells: {
          col0: 15,
          col1: '상점',
          col2: '-',
          col3: 0,
          col4: 0,
          col5: 0,
          col6: 0,
          col7: '휴식 구간. 업그레이드 선택. 플로우 조절',
        },
      },
      {
        cells: {
          col0: 20,
          col1: '보스',
          col2: 'ENM_BOSS',
          col3: 1,
          col4: '=SCALE(5, 웨이브/10, 1.5, "exponential")',
          col5: '=수량*HP배율',
          col6: '=SCALE(500, 웨이브, 1.15, "exponential")',
          col7: '2번째 보스. 첫 보스 대비 2.25배 HP',
        },
      },
    ],
  },

  // ========================================
  // 12. 로그라이크 유물/시너지
  // ========================================
  {
    id: 'roguelike-relic',
    name: '[로그라이크] 유물 시스템',
    description: '유물 효과와 시너지 설계. 빌드 다양성과 파워 스파이크.',
    category: 'item',
    genre: ['roguelike', 'card'],
    context: '유물 1개 = 전투력 10~20% 증가. 시너지 시 추가 보너스',
    keyMetrics: [
      '등급별 효과: 커먼 10%, 레어 20%, 에픽 35% (1.5배씩 증가)',
      '10개 제한: 최대 커먼풀 100%, 레어풀 200%, 에픽풀 350%',
      '시너지 보너스 50%: 3개 조합 시 1.5배 → 빌드 방향성 유도',
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '이름', type: 'general' as ColumnType, width: 110 },
      { name: '등급', type: 'general' as ColumnType, width: 60 },
      { name: '등급배율', type: 'general' as ColumnType, width: 80 },
      { name: '효과타입', type: 'general' as ColumnType, width: 90 },
      { name: '효과값', type: 'formula' as ColumnType, width: 100 },
      { name: '효과근거', type: 'general' as ColumnType, width: 150 },
      { name: '시너지태그', type: 'general' as ColumnType, width: 80 },
      { name: '시너지조건', type: 'general' as ColumnType, width: 90 },
      { name: '시너지효과', type: 'general' as ColumnType, width: 130 },
      { name: '설계의도', type: 'general' as ColumnType, width: 220 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'REL_001',
          col1: '낡은 장갑',
          col2: '커먼',
          col3: 0.1,
          col4: 'ATK증가',
          col5: '=등급배율',
          col6: '커먼 기준 10%',
          col7: '전사',
          col8: '전사 3개',
          col9: 'ATK +15% 추가',
          col10: '10%+시너지15%=25%. 커먼 3개로 에픽급 효과',
        },
      },
      {
        cells: {
          col0: 'REL_002',
          col1: '뱀파이어 송곳니',
          col2: '레어',
          col3: 0.2,
          col4: '흡혈',
          col5: '=등급배율*0.5',
          col6: '레어 20%×0.5(흡혈밸런스)',
          col7: '생존',
          col8: '생존 2개',
          col9: '흡혈 +5% 추가',
          col10: '흡혈 10%+시너지5%=15%. DPS 100기준 초당15HP 회복',
        },
      },
      {
        cells: {
          col0: 'REL_003',
          col1: '분노의 가면',
          col2: '에픽',
          col3: 0.35,
          col4: 'ATK증가',
          col5: '=등급배율',
          col6: '에픽 기준 35%',
          col7: '광전사',
          col8: 'HP 50% 이하',
          col9: 'ATK 2배',
          col10: '35%×2=70%. 조건부지만 에픽2개급 효과',
        },
      },
      {
        cells: {
          col0: 'REL_004',
          col1: '시간의 모래',
          col2: '에픽',
          col3: 0.35,
          col4: '쿨타임감소',
          col5: '=등급배율*0.7',
          col6: '에픽 35%×0.7(쿨감밸런스)',
          col7: '마법사',
          col8: '마법사 3개',
          col9: '추가 15% 감소',
          col10: '25%+시너지15%=40%. 쿨10초→6초. DPS 1.67배',
        },
      },
    ],
  },

  // ========================================
  // 13. 카드 게임 덱 설계
  // ========================================
  {
    id: 'card-deck',
    name: '[카드게임] 카드 밸런스',
    description: '카드 코스트 대비 효율. 마나 커브와 카드 가치 설계.',
    category: 'card',
    genre: ['card', 'roguelike'],
    context: '1코스트당 효율 동일. 고코스트는 추가 효과로 가치 차등',
    keyMetrics: [
      '기본 효율: 1코스트 = 6데미지 or 5방어',
      '고코스트 보너스: 3코스트 이상 +10% 효율',
      '0코스트 카드는 효과 50%로 페널티',
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '카드명', type: 'general' as ColumnType, width: 110 },
      { name: '등급', type: 'general' as ColumnType, width: 60 },
      { name: '타입', type: 'general' as ColumnType, width: 65 },
      { name: '코스트', type: 'general' as ColumnType, width: 60 },
      { name: '데미지', type: 'general' as ColumnType, width: 65 },
      { name: '방어도', type: 'general' as ColumnType, width: 65 },
      { name: '효율', type: 'formula' as ColumnType, width: 75 },
      { name: '추가효과', type: 'general' as ColumnType, width: 130 },
      { name: '설계의도', type: 'general' as ColumnType, width: 230 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'CRD_001',
          col1: '타격',
          col2: '기본',
          col3: '공격',
          col4: 1,
          col5: 6,
          col6: 0,
          col7: '=데미지/코스트',
          col8: '없음',
          col9: '효율 6.0. 기준 카드. 업그레이드 시 9데미지',
        },
      },
      {
        cells: {
          col0: 'CRD_002',
          col1: '수비',
          col2: '기본',
          col3: '스킬',
          col4: 1,
          col5: 0,
          col6: 5,
          col7: '=방어도/코스트',
          col8: '없음',
          col9: '효율 5.0. 방어는 데미지보다 약간 낮게 설계',
        },
      },
      {
        cells: {
          col0: 'CRD_003',
          col1: '분노의 일격',
          col2: '언커먼',
          col3: '공격',
          col4: 2,
          col5: 14,
          col6: 0,
          col7: '=데미지/코스트',
          col8: '취약 1',
          col9: '효율 7.0 + 디버프. 2코스트 기본(12)+보너스',
        },
      },
      {
        cells: {
          col0: 'CRD_004',
          col1: '바리케이드',
          col2: '레어',
          col3: '파워',
          col4: 3,
          col5: 0,
          col6: 0,
          col7: '-',
          col8: '방어도 유지',
          col9: '직접 효율 없음. 영구 효과로 후반 가치 급상승',
        },
      },
      {
        cells: {
          col0: 'CRD_005',
          col1: '섬광',
          col2: '언커먼',
          col3: '스킬',
          col4: 0,
          col5: 0,
          col6: 0,
          col7: '-',
          col8: '카드 1장 드로우',
          col9: '0코스트 유틸. 덱 압축+핸드 순환',
        },
      },
    ],
  },

  // ========================================
  // 14. 밸런스 비교 분석표
  // ========================================
  {
    id: 'analysis-compare',
    name: '밸런스 비교 분석표',
    description: '캐릭터/무기 간 객관적 비교. 정량 지표로 밸런스 검증.',
    category: 'analysis',
    genre: ['rpg', 'fps', 'moba', 'action'],
    context: '같은 등급 내 총점 ±10% 이내 유지. 역할별 특화 허용',
    keyMetrics: [
      'DPS/EHP는 캐릭터시트에서 참조. =캐릭터.DPS, =캐릭터.EHP',
      '정규화: MAX(DPS)=300(암살자) 기준 상대 점수',
      'S등급 = 90점 이상, A등급 = 75~89점',
    ],
    columns: [
      { name: '대상', type: 'general' as ColumnType, width: 100 },
      { name: '역할', type: 'general' as ColumnType, width: 70 },
      { name: 'DPS출처', type: 'general' as ColumnType, width: 130 },
      { name: 'DPS', type: 'formula' as ColumnType, width: 80 },
      { name: 'DPS점수', type: 'formula' as ColumnType, width: 85 },
      { name: 'EHP출처', type: 'general' as ColumnType, width: 130 },
      { name: 'EHP', type: 'formula' as ColumnType, width: 80 },
      { name: 'EHP점수', type: 'formula' as ColumnType, width: 85 },
      { name: '유틸점수', type: 'general' as ColumnType, width: 80 },
      { name: '종합점수', type: 'formula' as ColumnType, width: 85 },
      { name: '등급', type: 'formula' as ColumnType, width: 55 },
      { name: '분석', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: '철갑 기사',
          col1: '탱커',
          col2: '=캐릭터스탯.CHAR_001.DPS',
          col3: '=VLOOKUP(대상, 캐릭터스탯, DPS)',
          col4: '=DPS/300*40',
          col5: '=캐릭터스탯.CHAR_001.EHP',
          col6: '=VLOOKUP(대상, 캐릭터스탯, EHP)',
          col7: '=EHP/3750*40',
          col8: 15,
          col9: '=DPS점수+EHP점수+유틸점수',
          col10: '=IF(종합점수>=90,"S",IF(종합점수>=75,"A","B"))',
          col11: 'DPS 85(28%)→11점, EHP 3750(100%)→40점. 유틸15점. 총66점=A',
        },
      },
      {
        cells: {
          col0: '암살자',
          col1: '딜러',
          col2: '=캐릭터스탯.CHAR_002.DPS',
          col3: '=VLOOKUP(대상, 캐릭터스탯, DPS)',
          col4: '=DPS/300*40',
          col5: '=캐릭터스탯.CHAR_002.EHP',
          col6: '=VLOOKUP(대상, 캐릭터스탯, EHP)',
          col7: '=EHP/3750*40',
          col8: 5,
          col9: '=DPS점수+EHP점수+유틸점수',
          col10: '=IF(종합점수>=90,"S",IF(종합점수>=75,"A","B"))',
          col11: 'DPS 300(100%)→40점, EHP 980(26%)→10점. 유틸5점. 총55점=B. 딜 특화',
        },
      },
      {
        cells: {
          col0: '사제',
          col1: '힐러',
          col2: '=캐릭터스탯.CHAR_003.DPS',
          col3: '=VLOOKUP(대상, 캐릭터스탯, DPS)',
          col4: '=DPS/300*40',
          col5: '=캐릭터스탯.CHAR_003.EHP',
          col6: '=VLOOKUP(대상, 캐릭터스탯, EHP)',
          col7: '=EHP/3750*40',
          col8: 35,
          col9: '=DPS점수+EHP점수+유틸점수',
          col10: '=IF(종합점수>=90,"S",IF(종합점수>=75,"A","B"))',
          col11: 'DPS 65(22%)→9점, EHP 1590(42%)→17점. 유틸35점(힐). 총61점=B',
        },
      },
      {
        cells: {
          col0: '마법사',
          col1: '딜러',
          col2: '=캐릭터스탯.CHAR_004.DPS',
          col3: '=VLOOKUP(대상, 캐릭터스탯, DPS)',
          col4: '=DPS/300*40',
          col5: '=캐릭터스탯.CHAR_004.EHP',
          col6: '=VLOOKUP(대상, 캐릭터스탯, EHP)',
          col7: '=EHP/3750*40',
          col8: 20,
          col9: '=DPS점수+EHP점수+유틸점수',
          col10: '=IF(종합점수>=90,"S",IF(종합점수>=75,"A","B"))',
          col11: 'DPS 200(67%)→27점, EHP 1160(31%)→12점. 유틸20점(범위기). 총59점=B',
        },
      },
    ],
  },

  // ========================================
  // 15. 드랍 테이블
  // ========================================
  {
    id: 'drop-table',
    name: '드랍 테이블 설계',
    description: '아이템 드랍 확률과 기대값. 파밍 효율 계산.',
    category: 'reward',
    genre: ['rpg', 'action', 'roguelike', 'fps'],
    context: '기대 보상 = (확률 × 평균 수량)의 합. 시간당 파밍 효율로 밸런스',
    keyMetrics: [
      '기대값 = 확률 × (최소+최대)/2',
      '시간당 효율 = 기대값 / 평균 클리어 시간',
      '희귀템 확률 1% 미만 시 천장 시스템 고려',
    ],
    columns: [
      { name: '소스', type: 'general' as ColumnType, width: 100 },
      { name: '소스레벨', type: 'general' as ColumnType, width: 80 },
      { name: '아이템', type: 'general' as ColumnType, width: 110 },
      { name: '확률(%)', type: 'general' as ColumnType, width: 75 },
      { name: '최소', type: 'general' as ColumnType, width: 55 },
      { name: '최대', type: 'general' as ColumnType, width: 55 },
      { name: '기대값', type: 'formula' as ColumnType, width: 80 },
      { name: '클리어시간(초)', type: 'general' as ColumnType, width: 105 },
      { name: '시간당기대값', type: 'formula' as ColumnType, width: 105 },
      { name: '설계의도', type: 'general' as ColumnType, width: 220 },
    ],
    sampleRows: [
      {
        cells: {
          col0: '슬라임',
          col1: 1,
          col2: 'HP 포션',
          col3: 30,
          col4: 1,
          col5: 2,
          col6: '=확률(%)/100*(최소+최대)/2',
          col7: 5,
          col8: '=기대값/클리어시간(초)*3600',
          col9: '초반 회복템. 기대값 0.45개. 시간당 324개',
        },
      },
      {
        cells: {
          col0: '슬라임',
          col1: 1,
          col2: '슬라임 젤리',
          col3: 50,
          col4: 1,
          col5: 3,
          col6: '=확률(%)/100*(최소+최대)/2',
          col7: 5,
          col8: '=기대값/클리어시간(초)*3600',
          col9: '제작 재료. 기대값 1개. 10개 수집에 50초',
        },
      },
      {
        cells: {
          col0: '오크 대장',
          col1: 5,
          col2: '레어 장비',
          col3: 5,
          col4: 1,
          col5: 1,
          col6: '=확률(%)/100*(최소+최대)/2',
          col7: 60,
          col8: '=기대값/클리어시간(초)*3600',
          col9: '엘리트 보상. 20회 처치에 1개 기대. 20분 파밍',
        },
      },
      {
        cells: {
          col0: '드래곤',
          col1: 10,
          col2: '전설 장비',
          col3: 1,
          col4: 1,
          col5: 1,
          col6: '=확률(%)/100*(최소+최대)/2',
          col7: 300,
          col8: '=기대값/클리어시간(초)*3600',
          col9: '1% 확률. 100회 클리어 기대. 약 8시간 파밍',
        },
      },
    ],
  },

  // ========================================
  // 16. 재화 설정
  // ========================================
  {
    id: 'economy-currency',
    name: '재화 시스템 설계',
    description: '게임 내 재화 종류, 용도, 획득/소비 경로.',
    category: 'economy',
    genre: ['rpg', 'idle', 'moba', 'card', 'strategy'],
    context: '재화 종류는 3~5개 권장. 너무 많으면 복잡, 적으면 단조로움',
    keyMetrics: [
      '소프트 재화: 무제한 획득, 자유 사용 (골드)',
      '하드 재화: 제한 획득, 희소 가치 (다이아)',
      '에너지: 회복 제한, 플레이 제한 (스태미나)',
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '재화명', type: 'general' as ColumnType, width: 90 },
      { name: '타입', type: 'general' as ColumnType, width: 70 },
      { name: '최대보유', type: 'general' as ColumnType, width: 100 },
      { name: '주획득경로', type: 'general' as ColumnType, width: 140 },
      { name: '주소비처', type: 'general' as ColumnType, width: 140 },
      { name: '일일획득량', type: 'general' as ColumnType, width: 95 },
      { name: '설계의도', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'CUR_001',
          col1: '골드',
          col2: '소프트',
          col3: 999999999,
          col4: '전투, 퀘스트, 판매',
          col5: '강화, 상점, 제작',
          col6: 45000,
          col7: '기본 경제 재화. 무제한 파밍. 주요 Sink로 순환',
        },
      },
      {
        cells: {
          col0: 'CUR_002',
          col1: '다이아',
          col2: '하드',
          col3: 99999,
          col4: '업적, 이벤트, 과금',
          col5: '가챠, 스태미나 충전',
          col6: 100,
          col7: '프리미엄 재화. 일 100개로 무과금 플레이 가능',
        },
      },
      {
        cells: {
          col0: 'CUR_003',
          col1: '스태미나',
          col2: '에너지',
          col3: 200,
          col4: '시간회복(5분/1), 다이아',
          col5: '스테이지 입장(10/회)',
          col6: 288,
          col7: '5분당 1회복→1시간12개→24시간288개. 최대200은 16.7시간분. 아침 풀충전→저녁까지 유지',
        },
      },
      {
        cells: {
          col0: 'CUR_004',
          col1: '명예 포인트',
          col2: '소프트',
          col3: 50000,
          col4: 'PvP 보상',
          col5: 'PvP 상점',
          col6: 500,
          col7: 'PvP 전용 재화. 별도 경제권으로 PvE 무관',
        },
      },
    ],
  },

  // ========================================
  // 17. MOBA 챔피언 설계
  // ========================================
  {
    id: 'moba-champion',
    name: '[MOBA] 챔피언 스탯',
    description: '챔피언 기본 스탯과 레벨당 성장. 역할별 스케일링 차등.',
    category: 'character',
    genre: ['moba'],
    context: '18레벨 기준 밸런스. 초반 강캐 vs 후반 강캐 설계',
    keyMetrics: [
      '초반형: 높은 기본값, 낮은 성장률 (초반 우위)',
      '후반형: 낮은 기본값, 높은 성장률 (후반 강세)',
      '레벨18 기준 총 스탯 유사하게 조정',
    ],
    columns: [
      { name: 'ID', type: 'general' as ColumnType, width: 80 },
      { name: '챔피언명', type: 'general' as ColumnType, width: 100 },
      { name: '역할', type: 'general' as ColumnType, width: 70 },
      { name: '타입', type: 'general' as ColumnType, width: 65 },
      { name: 'HP(1렙)', type: 'general' as ColumnType, width: 80 },
      { name: 'HP성장', type: 'general' as ColumnType, width: 75 },
      { name: 'HP(18렙)', type: 'formula' as ColumnType, width: 90 },
      { name: 'AD(1렙)', type: 'general' as ColumnType, width: 75 },
      { name: 'AD성장', type: 'general' as ColumnType, width: 75 },
      { name: 'AD(18렙)', type: 'formula' as ColumnType, width: 85 },
      { name: '설계의도', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 'CHMP_001',
          col1: '전사',
          col2: '파이터',
          col3: '후반형',
          col4: 580,
          col5: 95,
          col6: '=HP(1렙)+HP성장*17',
          col7: 60,
          col8: 3.5,
          col9: '=AD(1렙)+AD성장*17',
          col10: 'HP 2195, AD 120 @18렙. 후반 탱딜 역할',
        },
      },
      {
        cells: {
          col0: 'CHMP_002',
          col1: '마법사',
          col2: '메이지',
          col3: '중립',
          col4: 520,
          col5: 80,
          col6: '=HP(1렙)+HP성장*17',
          col7: 52,
          col8: 2.5,
          col9: '=AD(1렙)+AD성장*17',
          col10: 'HP 1880, AD 95 @18렙. AP 스케일링이 본체',
        },
      },
      {
        cells: {
          col0: 'CHMP_003',
          col1: '저격수',
          col2: '원거리딜',
          col3: '후반형',
          col4: 500,
          col5: 85,
          col6: '=HP(1렙)+HP성장*17',
          col7: 58,
          col8: 4.0,
          col9: '=AD(1렙)+AD성장*17',
          col10: 'HP 1945, AD 126 @18렙. 최고 AD 성장. 후반 캐리',
        },
      },
      {
        cells: {
          col0: 'CHMP_004',
          col1: '암살자',
          col2: '어쌔신',
          col3: '초반형',
          col4: 600,
          col5: 70,
          col6: '=HP(1렙)+HP성장*17',
          col7: 68,
          col8: 2.0,
          col9: '=AD(1렙)+AD성장*17',
          col10: 'HP 1790, AD 102 @18렙. 높은 초반 AD. 스노우볼',
        },
      },
    ],
  },

  // ========================================
  // 18. 환생/프레스티지 시스템
  // ========================================
  {
    id: 'idle-prestige',
    name: '[방치형] 환생 시스템',
    description: '환생(리셋) 보너스와 조건. 장기 성장 동기 부여.',
    category: 'progression',
    genre: ['idle', 'roguelike'],
    context: '환생 1회 = 2~3일 진행 단축. 10회 환생 후 콘텐츠 확장',
    keyMetrics: [
      '환생 조건: 현재 진행의 50~70% 지점',
      '환생 보너스: 1.5~2.0배 데미지 (체감되는 파워)',
      '영구 획득: 다음 런 시작 상태 개선',
    ],
    columns: [
      { name: '환생횟수', type: 'general' as ColumnType, width: 85 },
      { name: '필요조건', type: 'general' as ColumnType, width: 140 },
      { name: '예상소요시간', type: 'general' as ColumnType, width: 100 },
      { name: '데미지배율', type: 'general' as ColumnType, width: 95 },
      { name: '누적배율', type: 'formula' as ColumnType, width: 90 },
      { name: '영구획득', type: 'general' as ColumnType, width: 150 },
      { name: '설계의도', type: 'general' as ColumnType, width: 250 },
    ],
    sampleRows: [
      {
        cells: {
          col0: 1,
          col1: '스테이지 50 클리어',
          col2: '3일',
          col3: 1.5,
          col4: 1.5,
          col5: '환생 스킬 해금',
          col6: '첫 환생. 1.5배로 체감 상승. 시스템 이해',
        },
      },
      {
        cells: {
          col0: 2,
          col1: '스테이지 50 클리어',
          col2: '2일',
          col3: 1.5,
          col4: '=누적배율*1.5',
          col5: '환생 포인트 +10',
          col6: '누적 2.25배. 1차보다 1일 단축. 성장 체감',
        },
      },
      {
        cells: {
          col0: 5,
          col1: '스테이지 75 클리어',
          col2: '3일',
          col3: 1.5,
          col4: '=POWER(1.5, 환생횟수)',
          col5: '자동스킬 해금',
          col6: '누적 7.6배. 조건 상향. 새 콘텐츠 개방',
        },
      },
      {
        cells: {
          col0: 10,
          col1: '스테이지 100 클리어',
          col2: '4일',
          col3: 2.0,
          col4: '=POWER(1.5, 환생횟수-1)*2',
          col5: '2차 환생 시스템 해금',
          col6: '누적 76배. 특별 보너스 2배. 새 층위 개방',
        },
      },
    ],
  },
];

// 카테고리 정의
export const templateCategories = [
  { id: 'config', name: '설정', icon: '' },
  { id: 'character', name: '캐릭터', icon: '' },
  { id: 'equipment', name: '장비', icon: '' },
  { id: 'skill', name: '스킬', icon: '' },
  { id: 'enemy', name: '적/몬스터', icon: '' },
  { id: 'unit', name: '유닛', icon: '' },
  { id: 'item', name: '아이템', icon: '' },
  { id: 'card', name: '카드', icon: '' },
  { id: 'stage', name: '스테이지', icon: '' },
  { id: 'progression', name: '성장', icon: '' },
  { id: 'economy', name: '경제', icon: '' },
  { id: 'gacha', name: '가챠', icon: '' },
  { id: 'reward', name: '보상', icon: '' },
  { id: 'analysis', name: '분석', icon: '' },
];

// 템플릿으로 시트 생성
export function createSheetFromTemplate(template: SheetTemplate): Sheet {
  const now = Date.now();

  // 컬럼 생성 (ID 부여)
  const columns: Column[] = template.columns.map((col) => ({
    ...col,
    id: uuidv4(),
  }));

  // 샘플 데이터 생성 (컬럼 ID 매핑)
  const rows: Row[] = (template.sampleRows || []).map((sampleRow) => {
    const cells: Record<string, string | number | null> = {};

    // col0, col1, col2... 형식의 키를 실제 컬럼 ID로 매핑
    Object.entries(sampleRow.cells).forEach(([key, value]) => {
      const index = parseInt(key.replace('col', ''));
      if (!isNaN(index) && columns[index]) {
        cells[columns[index].id] = value;
      }
    });

    return {
      id: uuidv4(),
      cells,
    };
  });

  return {
    id: uuidv4(),
    name: template.name,
    columns,
    rows,
    createdAt: now,
    updatedAt: now,
  };
}

// 템플릿 검색
export function searchTemplates(query: string): SheetTemplate[] {
  const lowerQuery = query.toLowerCase();
  return sheetTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
  );
}

// 카테고리별 템플릿 가져오기
export function getTemplatesByCategory(category: string): SheetTemplate[] {
  return sheetTemplates.filter((t) => t.category === category);
}

// 장르별 템플릿 가져오기
export function getTemplatesByGenre(genre: string): SheetTemplate[] {
  return sheetTemplates.filter((t) => t.genre?.includes(genre));
}
