# Test Scripts

Manual test scripts for Zeon automation workflows.

## amp-repo-automation.js

Clones a repository, runs the Amp CLI to perform tasks, then commits and pushes changes.

### Usage

```bash
node amp-repo-automation.js [branch] < repo-url > "<amp-prompt>"
```

### Examples

```bash
# Fix ESLint errors in a repo
node amp-repo-automation.js https://github.com/user/repo "Fix all ESLint errors" main

# Add documentation
node amp-repo-automation.js git@github.com:user/repo.git "Add JSDoc comments to all exported functions"

# Custom commit message
COMMIT_MESSAGE="feat: add types" node amp-repo-automation.js https://github.com/user/repo "Add TypeScript types"
```

### Environment Variables

| Variable         | Description                                    | Default                                |
| ---------------- | ---------------------------------------------- | -------------------------------------- |
| `AMP_API_KEY`    | Amp API key (required for non-interactive use) | None                                   |
| `GITHUB_TOKEN`   | GitHub token for private repos                 | None                                   |
| `COMMIT_MESSAGE` | Custom commit message                          | `chore: automated changes via Amp CLI` |

### Requirements

- Git installed and configured with push access
- [Amp CLI](https://ampcode.com) installed globally (`curl -fsSL https://ampcode.com/install | bash`)
- Node.js 18+
- `AMP_API_KEY` environment variable set for programmatic use

### How It Works

The script uses the Amp CLI with:

- `--execute` (`-x`) flag for non-interactive execution
- `--dangerously-allow-all` to auto-approve all tool uses without prompting
