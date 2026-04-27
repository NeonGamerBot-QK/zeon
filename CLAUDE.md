# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start the Probot app
npm test           # Run Jest tests
npm test -- --coverage  # Run tests with coverage
npx standard       # Lint with StandardJS
```

For local webhook development, set `WEBHOOK_PROXY_URL` to a Smee.io channel URL and run `npm start`.

## Architecture

**Zeon** is a monolithic [Probot](https://probot.github.io/) GitHub App that bundles multiple independent automation modules into a single deployable bot.

### Entry point

`index.js` is the root Probot entry point. It imports and wires up all sub-modules by calling each with the Probot `app` instance. Every sub-module exports a function with signature `(app) => { ... }` that registers GitHub webhook listeners.

### Modules

Each directory is a self-contained module:

| Module | What it does |
|---|---|
| `AiCodeReview/` | GPT-powered code review; calls OpenAI API on PR patches |
| `autoApproval/` | Auto-approves/merges PRs based on `.github/autoapproval.yml` config |
| `DCO/` | Validates Developer Certificate of Origin on commits |
| `DeletePRBranch/` | Deletes head branches after PR merge |
| `DupIssue/` | Detects duplicate issues using fuzzy search (`fuse.js`) |
| `Linter/` | Runs linting checks on PRs |
| `MistakenPR/` | Blocks PRs to specific repos |
| `pull/` | Keeps forks in sync with upstream; has its own `package.json` and tests |
| `ReleasePlease/` | Conventional commits → automated releases and CHANGELOG |
| `SimilarCode/` | Detects duplicated code patterns in PRs |
| `Stale/` | Marks and closes stale issues on a schedule |
| `weekly-digest/` | Posts weekly activity summaries; has its own `package.json` and tests |

`pull/` and `weekly-digest/` are effectively embedded sub-apps with their own dependency trees, test suites, and `index.js` entry points.

### Event-driven flow

Modules register handlers for GitHub webhook events (`pull_request.opened`, `issues.opened`, `deployment`, `schedule.repository`, etc.). `probot-config` loads per-repo YAML config from `.github/<module>.yml`. `probot-scheduler` drives time-based handlers.

### Configuration files consumed at runtime

- `.github/autoapproval.yml` — AutoApproval rules
- `.github/pull.yml` — Fork-sync settings
- `.github/weekly-digest.yml` — Digest customization
- `.github/zeon/release-please-config.json` — Release config
- `.github/zeon/templates/pr/{type}-message.md` — PR comment templates

### Code style

- Plain JavaScript (no TypeScript)
- StandardJS — no `.eslintrc`, run via `npx standard`
- Jest for tests; test files use `.test.js` suffix
- `nock` for HTTP mocking in tests

### Key environment variables

See `.env.example`. Required at minimum: `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`. `LOG_LEVEL=debug` is useful locally.
