# PowerBalance

**Game Balancing Tool for Indie Developers**

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
- **Game Engine Export** - Unity (ScriptableObject), Godot (Resource), Unreal (USTRUCT)
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
- [ ] Cloud sync
- [ ] Team collaboration
- [ ] Economy system simulation

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

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
- **게임 엔진 내보내기** - Unity (ScriptableObject), Godot (Resource), Unreal (USTRUCT)
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

- [Game Balance Concepts](https://gamebalanceconcepts.wordpress.com/) - Ian Schreiber
- [Game Balancing](https://gamebalancing.wordpress.com/) - 실무 적용 사례
- [상세 기획 문서](docs/DESIGN_KO.md)

## 라이선스

MIT License
