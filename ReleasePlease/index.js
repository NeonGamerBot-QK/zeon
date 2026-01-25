/**
 * Release Please Probot Module
 *
 * Automates CHANGELOG generation, version bumps, and GitHub releases
 * based on Conventional Commits (feat:, fix:, etc.).
 *
 * Features:
 * - Creates/updates "Release PRs" with changelog and version bumps
 * - Creates GitHub Releases when Release PRs are merged
 * - Supports Node.js projects (package.json versioning)
 * - Can be triggered via push, PR merge, or label
 *
 * Configuration:
 * Repos can add `.github/zeon/release-please-config.json` to customize behavior.
 *
 * @param {import('probot').Probot} app - The Probot application instance
 */

const { Manifest, GitHub } = require("release-please");

// Default configuration for release-please
const DEFAULT_CONFIG = {
  releaseType: "node",
  changelogPath: "CHANGELOG.md",
  includeVInTag: true,
  labels: ["autorelease: pending"],
  releaseLabels: ["autorelease: tagged"],
};

// Repos that have release-please enabled (add yours here or use config file)
const ENABLED_REPOS = [
  // "NeonGamerBot-QK/some-repo",
];

/**
 * Creates a GitHub client for release-please from Probot context
 *
 * @param {object} ctx - Probot context
 * @returns {Promise<GitHub>} - Release-please GitHub client
 */
async function createReleasePleaseGitHub(ctx) {
  const owner = ctx.payload.repository.owner.login;
  const repo = ctx.payload.repository.name;

  // Get the installation token from Probot's octokit
  const { token } = await ctx.octokit.auth({ type: "installation" });

  return GitHub.create({
    owner,
    repo,
    token,
    defaultBranch: ctx.payload.repository.default_branch || "main",
  });
}

/**
 * Loads release-please configuration from the repository
 *
 * @param {object} ctx - Probot context
 * @returns {Promise<object>} - Configuration object
 */
async function loadRepoConfig(ctx) {
  try {
    const configFile = await ctx.octokit.repos.getContent({
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
      path: ".github/zeon/release-please-config.json",
    });

    const content = Buffer.from(configFile.data.content, "base64").toString();
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch (e) {
    // No config file found, use defaults
    return DEFAULT_CONFIG;
  }
}

/**
 * Checks if release-please is enabled for this repository
 *
 * @param {object} ctx - Probot context
 * @returns {Promise<boolean>} - Whether release-please is enabled
 */
async function isEnabled(ctx) {
  const fullName = ctx.payload.repository.full_name;

  // Check hardcoded list first
  if (ENABLED_REPOS.includes(fullName)) {
    return true;
  }

  // Check if repo has a config file (enables automatically)
  try {
    await ctx.octokit.repos.getContent({
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
      path: ".github/zeon/release-please-config.json",
    });
    return true;
  } catch (e) {
    // No config file
  }

  // Check if repo has release-please-config.json at root
  try {
    await ctx.octokit.repos.getContent({
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
      path: "release-please-config.json",
    });
    return true;
  } catch (e) {
    // No config file
  }

  return false;
}

/**
 * Creates or updates release pull requests
 *
 * @param {object} ctx - Probot context
 * @param {object} app - Probot app instance
 */
async function createReleasePRs(ctx, app) {
  const owner = ctx.payload.repository.owner.login;
  const repo = ctx.payload.repository.name;
  const defaultBranch = ctx.payload.repository.default_branch || "main";

  app.log.info(`[ReleasePlease] Creating release PRs for ${owner}/${repo}`);

  try {
    const github = await createReleasePleaseGitHub(ctx);
    const config = await loadRepoConfig(ctx);

    // Check if repo has manifest files
    let manifest;
    try {
      manifest = await Manifest.fromManifest(
        github,
        defaultBranch,
        "release-please-config.json",
        ".release-please-manifest.json",
        {
          labels: config.labels,
          releaseLabels: config.releaseLabels,
        },
      );
    } catch (e) {
      // No manifest config, use single-package mode
      manifest = await Manifest.fromConfig(
        github,
        defaultBranch,
        {
          releaseType: config.releaseType,
          changelogPath: config.changelogPath,
          includeVInTag: config.includeVInTag,
        },
        {
          labels: config.labels,
          releaseLabels: config.releaseLabels,
        },
        ".",
      );
    }

    const pullRequests = await manifest.createPullRequests();
    const createdPRs = pullRequests.filter((pr) => pr !== undefined);

    if (createdPRs.length > 0) {
      app.log.info(
        `[ReleasePlease] Created/updated ${createdPRs.length} release PR(s) for ${owner}/${repo}`,
      );
      createdPRs.forEach((pr) => {
        app.log.info(`  - PR #${pr.number}: ${pr.title}`);
      });
    } else {
      app.log.info(
        `[ReleasePlease] No release PRs needed for ${owner}/${repo}`,
      );
    }

    return createdPRs;
  } catch (error) {
    app.log.error(
      `[ReleasePlease] Failed to create release PRs for ${owner}/${repo}: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Creates GitHub releases from merged release PRs
 *
 * @param {object} ctx - Probot context
 * @param {object} app - Probot app instance
 */
async function createReleases(ctx, app) {
  const owner = ctx.payload.repository.owner.login;
  const repo = ctx.payload.repository.name;
  const defaultBranch = ctx.payload.repository.default_branch || "main";

  app.log.info(`[ReleasePlease] Creating releases for ${owner}/${repo}`);

  try {
    const github = await createReleasePleaseGitHub(ctx);
    const config = await loadRepoConfig(ctx);

    // Check if repo has manifest files
    let manifest;
    try {
      manifest = await Manifest.fromManifest(
        github,
        defaultBranch,
        "release-please-config.json",
        ".release-please-manifest.json",
        {
          labels: config.labels,
          releaseLabels: config.releaseLabels,
        },
      );
    } catch (e) {
      // No manifest config, use single-package mode
      manifest = await Manifest.fromConfig(
        github,
        defaultBranch,
        {
          releaseType: config.releaseType,
          changelogPath: config.changelogPath,
          includeVInTag: config.includeVInTag,
        },
        {
          labels: config.labels,
          releaseLabels: config.releaseLabels,
        },
        ".",
      );
    }

    const releases = await manifest.createReleases();
    const createdReleases = releases.filter((r) => r !== undefined);

    if (createdReleases.length > 0) {
      app.log.info(
        `[ReleasePlease] Created ${createdReleases.length} release(s) for ${owner}/${repo}`,
      );
      createdReleases.forEach((release) => {
        app.log.info(`  - ${release.tagName}: ${release.version}`);
      });
    } else {
      app.log.info(`[ReleasePlease] No releases created for ${owner}/${repo}`);
    }

    return createdReleases;
  } catch (error) {
    app.log.error(
      `[ReleasePlease] Failed to create releases for ${owner}/${repo}: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Main module export
 *
 * @param {import('probot').Probot} app - The Probot application instance
 */
module.exports = (app) => {
  app.log.info("[ReleasePlease] Module loaded");

  // On push to default branch - create/update release PRs
  app.on("push", async (ctx) => {
    // Only process pushes to default branch
    const defaultBranch = ctx.payload.repository.default_branch || "main";
    const pushedBranch = ctx.payload.ref.replace("refs/heads/", "");

    if (pushedBranch !== defaultBranch) {
      return;
    }

    // Check if release-please is enabled for this repo
    if (!(await isEnabled(ctx))) {
      return;
    }

    try {
      await createReleasePRs(ctx, app);
    } catch (error) {
      app.log.error(`[ReleasePlease] Error on push: ${error.message}`);
    }
  });

  // On PR merge - create releases if it's a release PR
  app.on("pull_request.closed", async (ctx) => {
    // Only process merged PRs
    if (!ctx.payload.pull_request.merged) {
      return;
    }

    // Check if release-please is enabled for this repo
    if (!(await isEnabled(ctx))) {
      return;
    }

    // Check if this is a release PR (has autorelease: pending label)
    const labels = ctx.payload.pull_request.labels.map((l) => l.name);
    const isReleasePR =
      labels.includes("autorelease: pending") ||
      ctx.payload.pull_request.title.startsWith("chore(main): release") ||
      ctx.payload.pull_request.title.startsWith("chore: release");

    if (!isReleasePR) {
      // Not a release PR, but might trigger new release PR creation
      try {
        await createReleasePRs(ctx, app);
      } catch (error) {
        app.log.error(
          `[ReleasePlease] Error creating release PRs: ${error.message}`,
        );
      }
      return;
    }

    // This is a release PR - create the release
    try {
      const releases = await createReleases(ctx, app);

      // Comment on the PR about created releases
      if (releases.length > 0) {
        const releaseList = releases
          .map((r) => `- [${r.tagName}](${r.url})`)
          .join("\n");

        await ctx.octokit.issues.createComment({
          owner: ctx.payload.repository.owner.login,
          repo: ctx.payload.repository.name,
          issue_number: ctx.payload.pull_request.number,
          body: `## 🎉 Release Created!\n\nThe following release(s) have been created:\n\n${releaseList}`,
        });
      }
    } catch (error) {
      app.log.error(`[ReleasePlease] Error creating releases: ${error.message}`);

      // Comment about the failure
      await ctx.octokit.issues.createComment({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.pull_request.number,
        body: `## ⚠️ Release Creation Failed\n\nFailed to create release: ${error.message}\n\nPlease check the logs and try again.`,
      });
    }
  });

  // On label added - force run release-please
  app.on("pull_request.labeled", async (ctx) => {
    const labelName = ctx.payload.label.name;

    if (labelName !== "release-please:force-run") {
      return;
    }

    // Check if release-please is enabled for this repo
    if (!(await isEnabled(ctx))) {
      return;
    }

    app.log.info(
      `[ReleasePlease] Force run triggered by label on PR #${ctx.payload.pull_request.number}`,
    );

    try {
      await createReleasePRs(ctx, app);

      // Remove the force-run label
      await ctx.octokit.issues.removeLabel({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.pull_request.number,
        name: "release-please:force-run",
      });
    } catch (error) {
      app.log.error(`[ReleasePlease] Error on force run: ${error.message}`);
    }
  });

  // On issue comment - allow manual trigger via comment
  app.on("issue_comment.created", async (ctx) => {
    // Only process comments on PRs
    if (!ctx.payload.issue.pull_request) {
      return;
    }

    const comment = ctx.payload.comment.body.trim().toLowerCase();

    // Check for trigger command
    if (
      comment !== "/release-please" &&
      comment !== "zeon release" &&
      comment !== "/zeon release"
    ) {
      return;
    }

    // Check if release-please is enabled for this repo
    if (!(await isEnabled(ctx))) {
      return;
    }

    app.log.info(
      `[ReleasePlease] Manual trigger via comment on PR #${ctx.payload.issue.number}`,
    );

    try {
      const releases = await createReleasePRs(ctx, app);

      await ctx.octokit.issues.createComment({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.issue.number,
        body:
          releases.length > 0
            ? `## ✅ Release Please Completed\n\nCreated/updated ${releases.length} release PR(s).`
            : `## ✅ Release Please Completed\n\nNo release PRs needed at this time.`,
      });
    } catch (error) {
      app.log.error(
        `[ReleasePlease] Error on manual trigger: ${error.message}`,
      );

      await ctx.octokit.issues.createComment({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.issue.number,
        body: `## ⚠️ Release Please Failed\n\n${error.message}`,
      });
    }
  });
};
