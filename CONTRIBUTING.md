# Contributing to PowerBalance / 기여 가이드

First off, thank you for considering contributing to PowerBalance! 🎮

PowerBalance에 기여해주셔서 감사합니다! 🎮

## Table of Contents / 목차

- [Code of Conduct / 행동 강령](#code-of-conduct--행동-강령)
- [How Can I Contribute? / 어떻게 기여할 수 있나요?](#how-can-i-contribute--어떻게-기여할-수-있나요)
- [Development Setup / 개발 환경 설정](#development-setup--개발-환경-설정)
- [Pull Request Process / PR 프로세스](#pull-request-process--pr-프로세스)
- [Style Guide / 스타일 가이드](#style-guide--스타일-가이드)

## Code of Conduct / 행동 강령

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

이 프로젝트는 [행동 강령](CODE_OF_CONDUCT.md)을 따릅니다. 참여하시면 이 규칙을 준수해주세요.

## How Can I Contribute? / 어떻게 기여할 수 있나요?

### 🐛 Reporting Bugs / 버그 제보

- Check if the bug has already been reported in [Issues](https://github.com/dj258255/indiebalancing/issues)
- If not, create a new issue using the bug report template
- Include as much detail as possible

기존 이슈에 같은 버그가 있는지 확인 후, 없다면 버그 리포트 템플릿을 사용해 새 이슈를 만들어주세요.

### 💡 Suggesting Features / 기능 제안

- Open a new issue using the feature request template
- Explain the use case and why it would be useful

기능 요청 템플릿을 사용해 새 이슈를 만들어주세요. 사용 사례와 유용한 이유를 설명해주세요.

### 🔧 Code Contributions / 코드 기여

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with a descriptive message
5. Push to your branch
6. Open a Pull Request

## Development Setup / 개발 환경 설정

### Prerequisites / 필수 조건

- Node.js 20+
- npm 10+

### Installation / 설치

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/indiebalancing.git
cd indiebalancing/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure / 프로젝트 구조

```
frontend/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React components
│   │   ├── modals/    # Modal components
│   │   ├── panels/    # Panel components (tools)
│   │   ├── sheet/     # Spreadsheet components
│   │   └── ui/        # UI primitives
│   ├── hooks/         # Custom React hooks
│   ├── stores/        # Zustand stores
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── messages/          # i18n translations (en, ko)
└── public/            # Static assets
```

## Pull Request Process / PR 프로세스

1. **Update your fork** - Sync with the main repository
2. **Create a branch** - Use descriptive branch names
3. **Make changes** - Keep PRs focused and small
4. **Test locally** - Run `npm run build` to ensure no errors
5. **Submit PR** - Fill out the PR template completely
6. **Address feedback** - Respond to review comments

### Commit Message Convention / 커밋 메시지 규칙

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new DPS formula
fix: resolve calculation error in TTK
docs: update README with new features
style: improve panel layout
refactor: simplify formula parser
```

## Style Guide / 스타일 가이드

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer interfaces over types for objects
- Use proper typing, avoid `any`

### React

- Use functional components with hooks
- Keep components small and focused
- Use custom hooks for reusable logic

### Styling

- Use Tailwind CSS utility classes
- Use CSS variables for theming (`var(--primary-blue)`)
- Support both light and dark modes

### Code Quality

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Questions? / 질문이 있으신가요?

Feel free to open an issue or reach out!

이슈를 열거나 연락주세요!

---

Thank you for contributing! 🙏
기여해주셔서 감사합니다! 🙏
