<p align="center">
  <img src="frontend/public/icon.svg" alt="PowerBalance Logo" width="120" height="120">
</p>

<h1 align="center">PowerBalance</h1>

<p align="center">
  <strong>Game Balancing Tool for Indie Developers</strong>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[한국어](#한국어) | English

![Screenshot](docs/images/intro.png)

## What is PowerBalance?

A spreadsheet-based tool designed specifically for game balancing. Calculate DPS, EHP, TTK automatically, run Monte Carlo simulations, and export directly to Unity/Godot/Unreal.

**Live Demo:** https://indiebalancing.vercel.app/

## Features

- **70+ Game-Specific Formulas** - DPS, EHP, TTK, SCALE, DIMINISH, and more
- **Monte Carlo Simulation** - 1,000~100,000 battle simulations with 95% confidence intervals
- **Balance Analysis** - Z-score outlier detection, power curve analysis
- **Economy Simulation** - Faucet/Sink model, inflation calculator
- **DPS Variance Visualization** - Distribution graphs, build comparisons
- **Curve Fitting** - Draw graphs, auto-generate formulas (Linear, Exponential, Sigmoid, etc.)
- **Game Engine Export** - Unity (ScriptableObject), Godot (Resource), Unreal (USTRUCT)
- **SDK/API Integration** - REST, WebSocket, Firebase connection support
- **Local-First** - All data stored in browser (IndexedDB), no server required

## Quick Start

```bash
git clone https://github.com/username/powerbalance.git
cd powerbalance/frontend
npm install
npm run dev
```

Open `http://localhost:3000`

## Formula Examples

```
=DPS(atk, speed, crit, critDmg)    // Damage per second
=EHP(hp, def)                       // Effective HP
=TTK(hp, dps)                       // Time to kill
=SCALE(base, level, rate, "exp")    // Level scaling
=DIMINISH(value, soft, hard)        // Diminishing returns
=REF("Monsters", "Goblin", "HP")    // Cross-sheet reference
```

## Tech Stack

| Area | Technology |
|------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| State | Zustand |
| Storage | IndexedDB |
| Styling | Tailwind CSS |
| Charts | Recharts |

## Project Structure

```
powerbalance/
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React components
│   │   ├── lib/           # Formula engine, utilities
│   │   ├── stores/        # Zustand stores
│   │   └── types/         # TypeScript types
│   └── package.json
└── docs/                   # Documentation
```

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow ESLint + Prettier configuration
- Use [Conventional Commits](https://www.conventionalcommits.org/)
- Ensure `npm run build` passes before PR

## Roadmap

- [x] Spreadsheet-based UI
- [x] 70+ game-specific formulas
- [x] Monte Carlo simulation
- [x] Game engine export
- [x] Economy system simulation (Faucet/Sink, Inflation Calculator)
- [x] DPS Variance Visualization
- [x] Curve Fitting (Graph to Formula)
- [x] Game Data SDK/API Integration (REST, WebSocket, Firebase)
- [ ] Cloud sync
- [ ] Team collaboration

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Documentation (English)](docs/DESIGN_EN.md)
- [Documentation (한국어)](docs/DESIGN_KO.md)
- [Issues](https://github.com/username/powerbalance/issues)

---

# 한국어

**인디 게임 개발자를 위한 수치 밸런싱 도구**

## PowerBalance란?

게임 밸런싱에 특화된 스프레드시트 기반 도구입니다. DPS, EHP, TTK를 자동으로 계산하고, 몬테카를로 시뮬레이션을 돌리고, Unity/Godot/Unreal로 바로 내보낼 수 있습니다.

**데모:** https://indiebalancing.vercel.app/

## 주요 기능

- **70개+ 게임 특화 수식** - DPS, EHP, TTK, SCALE, DIMINISH 등
- **몬테카를로 시뮬레이션** - 1,000~100,000회 전투 시뮬레이션, 95% 신뢰구간
- **밸런스 분석** - Z-score 이상치 탐지, 파워 커브 분석
- **경제 시뮬레이션** - Faucet/Sink 모델, 인플레이션 계산기
- **DPS 분산 시각화** - 분포 그래프, 빌드 비교
- **곡선 피팅** - 그래프 그리기 → 자동 수식화 (선형, 지수, 시그모이드 등)
- **게임 엔진 내보내기** - Unity (ScriptableObject), Godot (Resource), Unreal (USTRUCT)
- **SDK/API 연동** - REST, WebSocket, Firebase 연결 지원
- **로컬 저장** - 브라우저에 저장 (IndexedDB), 서버 불필요

## 빠른 시작

```bash
git clone https://github.com/username/powerbalance.git
cd powerbalance/frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 수식 예시

```
=DPS(atk, speed, crit, critDmg)    // 초당 데미지
=EHP(hp, def)                       // 유효 체력
=TTK(hp, dps)                       // 처치 시간
=SCALE(base, level, rate, "exp")    // 레벨 스케일링
=DIMINISH(value, soft, hard)        // 수확체감
=REF("몬스터", "고블린", "HP")        // 시트 간 참조
```

## 기여하기

1. Fork
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 참고 자료

### 게임 밸런스 이론
- [Game Balance Concepts](https://gamebalanceconcepts.wordpress.com/) - Ian Schreiber
- [Game Balance Dissected](https://gamebalancing.wordpress.com/) - DPS, TTK, Fire Rate 계산

### 경제 설계
- [Machinations.io - Game Inflation](https://machinations.io/articles/what-is-game-economy-inflation-how-to-foresee-it-and-how-to-overcome-it-in-your-game-design) - Faucet/Sink 모델
- [Department of Play - Economy Principles](https://departmentofplay.net/the-principles-of-building-a-game-economy/) - 게임 경제 원칙
- [Lost Garden - Value Chains](https://lostgarden.com/2021/12/12/value-chains/) - 가치 사슬 설계

### 성장 곡선 및 난이도
- [Davide Aversa - RPG Progression](https://www.davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/) - 레벨 성장 수식
- [Game Developer - Difficulty Curves](https://www.gamedeveloper.com/design/difficulty-curves) - 난이도 곡선 패턴

### 통계 및 분석
- [GeeksforGeeks - Z-Score](https://www.geeksforgeeks.org/machine-learning/z-score-for-outlier-detection-python/) - 이상치 감지
- [Wikipedia - Monte Carlo Method](https://en.wikipedia.org/wiki/Monte_Carlo_method) - 몬테카를로 시뮬레이션

### 문서
- [상세 기획 문서 (한국어)](docs/DESIGN_KO.md)
- [Documentation (English)](docs/DESIGN_EN.md)

## 라이선스

MIT License
