# Release Please Module

Automates CHANGELOG generation, version bumps, and GitHub releases based on [Conventional Commits](https://www.conventionalcommits.org/).

## Features

- Creates/updates "Release PRs" with changelog and version bumps
- Creates GitHub Releases when Release PRs are merged
- Supports Node.js projects (package.json versioning)
- Supports monorepos via manifest configuration
- Manual trigger via comment or label

## How It Works

1. **Push to main branch** → Creates/updates a Release PR with:
   - Updated `CHANGELOG.md`
   - Version bump in `package.json`
   - Summary of changes since last release

2. **Merge Release PR** → Creates a GitHub Release with:
   - Git tag (e.g., `v1.2.0`)
   - Release notes from changelog
   - Applies `autorelease: tagged` label

## Enabling for a Repository

### Option 1: Add config file

Create `.github/zeon/release-please-config.json`:

```json
{
  "releaseType": "node",
  "changelogPath": "CHANGELOG.md",
  "includeVInTag": true
}
```

### Option 2: Use standard release-please config

Create `release-please-config.json` at repo root:

```json
{
  "packages": {
    ".": {
      "release-type": "node",
      "changelog-path": "CHANGELOG.md"
    }
  }
}
```

And `.release-please-manifest.json`:

```json
{
  ".": "1.0.0"
}
```

## Manual Triggers

### Via Comment

Comment on any PR:
- `/release-please`
- `/zeon release`
- `zeon release`

### Via Label

Add label `release-please:force-run` to any PR.

## Supported Release Types

| Type | Description |
|------|-------------|
| `node` | Node.js with package.json |
| `python` | Python with pyproject.toml/setup.py |
| `java` | Java with pom.xml |
| `ruby` | Ruby with version.rb |
| `go` | Go with CHANGELOG.md |
| `simple` | Generic with version.txt |

## Conventional Commits

The module uses conventional commit prefixes to determine version bumps:

| Prefix | Version Bump | Example |
|--------|--------------|---------|
| `fix:` | Patch (0.0.x) | `fix: resolve null pointer` |
| `feat:` | Minor (0.x.0) | `feat: add dark mode` |
| `feat!:` or `BREAKING CHANGE:` | Major (x.0.0) | `feat!: redesign API` |

## Labels

| Label | Purpose |
|-------|---------|
| `autorelease: pending` | Applied to open Release PRs |
| `autorelease: tagged` | Applied after release is created |
| `release-please:force-run` | Trigger manual release PR creation |

## Example Workflow

1. Developer merges PR with `feat: add user authentication`
2. Zeon creates Release PR titled "chore(main): release v1.1.0"
3. Release PR contains updated CHANGELOG and version bump
4. Maintainer reviews and merges Release PR
5. Zeon creates GitHub Release `v1.1.0` with release notes
