# Contributing to Gram Vikash

Thank you for your interest in contributing! 🌾 This document covers everything you need to know to make your first pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Convention](#commit-message-convention)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. By participating you agree to treat all contributors with respect.

---

## Getting Started

1. **Fork** the repository by clicking the Fork button on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/Gramvikash.git
   cd Gramvikash
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/YOUR_USERNAME/Gramvikash.git
   ```
4. **Set up the environment** following the steps in [README.md](README.md#-getting-started).

---

## Development Workflow

```
main           ← stable, protected. PRs only.
  └── develop  ← integration branch
        └── feat/your-feature  ← your work goes here
```

### Step-by-step

```bash
# 1. Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# 2. Create a feature branch
git checkout -b feat/describe-your-feature

# 3. Make your changes

# 4. Commit (see convention below)
git commit -m "feat(voicebot): add Bengali language profile"

# 5. Push and open a PR into 'main'
git push origin feat/describe-your-feature
```

---

## Commit Message Convention

We use **Conventional Commits** format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE or closes #issue]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons (no logic change) |
| `refactor` | Code restructure without feature/fix |
| `test` | Adding or fixing tests |
| `chore` | Build process, CI, dependencies |
| `perf` | Performance improvement |

### Examples

```
feat(hum-bolo): add Bengali language profile
fix(weather): handle network timeout gracefully
docs(readme): update quickstart instructions
chore(ci): pin actions to SHA for security
```

---

## Code Style

### Python (Backend)

- Follow **PEP 8**
- Max line length: **120 characters**
- Use `flake8` (same config as CI):
  ```bash
  cd gramvikash_api
  flake8 . --exclude=venv,migrations --max-line-length=120 --ignore=E501,W503,E402
  ```
- Use `python-dotenv` for all environment variable access — never hardcode secrets.

### JavaScript / React Native (Frontend)

- Use **ES6+** syntax and functional components with hooks.
- Prefer `const` over `let`; avoid `var`.
- Import API keys only from `src/constants/apiKeys.js` (which reads from `EXPO_PUBLIC_*` env vars).
- Component files: PascalCase (`HomeScreen.jsx`)
- Utility/service files: camelCase (`voiceService.js`)

### General Rules

- **No hardcoded API keys or secrets** — CI will reject PRs that introduce them.
- Always add entries to `.env.example` if you introduce a new environment variable.
- Update `README.md` if you change setup steps.

---

## Pull Request Process

1. Ensure CI passes (lint + Django check) on your branch.
2. Fill out the PR template completely.
3. Reference related issues using `closes #<issue_number>`.
4. Request review from at least one maintainer.
5. Squash commits before merge if the history is noisy.

### PR Checklist

- [ ] Description clearly explains *what* and *why*
- [ ] No hardcoded secrets
- [ ] New env vars are documented in `.env.example`
- [ ] CI is green
- [ ] Tests added/updated (if applicable)
- [ ] Documentation updated (if applicable)

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/YOUR_USERNAME/Gramvikash/issues/new?template=bug_report.md) and include:

- Steps to reproduce
- Expected vs. actual behavior
- Device/OS/Python version
- Relevant logs or screenshots

> For **security vulnerabilities**, see [SECURITY.md](SECURITY.md) — do NOT open a public issue.

---

## Suggesting Features

Open a [GitHub Issue](https://github.com/YOUR_USERNAME/Gramvikash/issues/new?template=feature_request.md) describing:

- The problem you're solving
- How this benefits farmers
- Any alternative approaches considered

---

## Questions?

Open a [Discussion](https://github.com/YOUR_USERNAME/Gramvikash/discussions) on GitHub — we're happy to help!
