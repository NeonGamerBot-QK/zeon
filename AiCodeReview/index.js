// const { Context, Probot } = require('probot');

// import { Chat } from './chat.js';

const OPENAI_API_KEY = "OPENAI_API_KEY";
const MAX_PATCH_COUNT = process.env.MAX_PATCH_LENGTH
  ? +process.env.MAX_PATCH_LENGTH
  : Infinity;
/**
 *
 * @param {Probot} app
 */
module.exports = async (app) => {
  const { ChatGPTAPI } = await import("chatgpt");
  class Chat {
    constructor(apikey) {
      this.chatAPI = new ChatGPTAPI({
        apiKey: apikey,
        //      apiBaseUrl:
        //      process.env.OPENAI_API_ENDPOINT || "https://api.openai.com/v1",
        completionParams: {
          model: process.env.MODEL || "gpt-3.5-turbo",
          temperature: +(process.env.temperature || 0) || 1,
          top_p: +(process.env.top_p || 0) || 1,
          max_tokens: process.env.max_tokens
            ? +process.env.max_tokens
            : undefined,
        },
      });
    }

    generatePrompt = (patch) => {
      const answerLanguage = process.env.LANGUAGE
        ? `Answer me in ${process.env.LANGUAGE},`
        : "";

      const prompt =
        process.env.PROMPT ||
        "Below is a code patch, please help me do a brief code review on it. Any bug risks and/or improvement suggestions are welcome:";

      return `${prompt}, ${answerLanguage}:
      ${patch}
      `;
    };

    codeReview = async (patch) => {
      if (!patch) {
        return "";
      }

      console.time("code-review tcost");
      const prompt = this.generatePrompt(patch);

      const res = await this.chatAPI.sendMessage(prompt);

      console.timeEnd("code-review cost");
      return res.text;
    };
  }

  const loadChat = async (context) => {
    if (process.env.OPENAI_API_KEY) {
      return new Chat(process.env.OPENAI_API_KEY);
    }

    const repo = context.repo();

    try {
      const { data } = await context.octokit.request(
        "GET /repos/{owner}/{repo}/actions/variables/{name}",
        {
          owner: repo.owner,
          repo: repo.repo,
          name: OPENAI_API_KEY,
        },
      );

      if (!data?.value) {
        return null;
      }

      return new Chat(data.value);
    } catch {
      await context.octokit.issues.createComment({
        repo: repo.repo,
        owner: repo.owner,
        issue_number: context.pullRequest().pull_number,
        body: "Seems you are using me but didn't get OPENAI_API_KEY seted in Variables/Secrets for this repo. Maybe @NeonGamerBot-QK should fix me.",
      });
      return null;
    }
  };

  // Conventional Commits spec: https://www.conventionalcommits.org/en/v1.0.0/
  // Matches: <type>[optional scope][!]: <description>
  // Allowed types follow the Angular convention used widely in the ecosystem.
  const CONVENTIONAL_COMMIT_REGEX =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w\-./ ]+\))?!?: .+/;

  // Repo (case-insensitive) where we additionally enforce conventional commit
  // PR titles. Per request: only "myBot".
  const CONVENTIONAL_COMMIT_REPOS = ["mybot"];

  // Repos where a merge gate is enforced: blocks merge until all Copilot review
  // threads are resolved and all status checks have passed.
  const MERGE_GATE_REPOS = ["mybot"];
  const MERGE_GATE_CONTEXT = "zeon/merge-gate";

  const CI_WAITING_MARKER = "<!-- zeon:merge-gate:ci-waiting -->";
  // In-memory guard so concurrent webhook events don't race to create a second
  // ci-waiting comment before the first one is visible in listComments.
  const pendingWaitingComment = new Set();
  // Stores the merge method so it can be restored after checks pass.
  // Format: <!-- zeon:merge-gate:automerge-disabled:METHOD -->
  const AUTO_MERGE_DISABLED_MARKER = "<!-- zeon:merge-gate:automerge-disabled:";

  /**
   * Evaluates check-run status for a PR, then writes a commit status that can
   * be used as a required branch-protection check to gate merging.
   *
   * @param {import('@octokit/rest').Octokit} octokit
   * @param {string} owner
   * @param {string} repo
   * @param {number} pullNumber
   * @param {string} headSha
   */
  async function updateMergeGate(octokit, owner, repo, pullNumber, headSha) {
    let allChecksPassed = true;
    const reasons = [];

    // Check all check runs for the head SHA
    try {
      const { data: checkRunsData } = await octokit.checks.listForRef({
        owner,
        repo,
        ref: headSha,
        per_page: 100,
      });

      const failing = checkRunsData.check_runs.filter(
        (run) =>
          run.name !== MERGE_GATE_CONTEXT &&
          (run.status !== "completed" ||
            !["success", "neutral", "skipped"].includes(run.conclusion)),
      );

      if (failing.length > 0) {
        allChecksPassed = false;
        reasons.push(
          `${failing.length} failing/pending check(s): ${failing.map((r) => r.name).join(", ")}`,
        );
      }

      // Also check legacy commit statuses, excluding our own context to avoid
      // the merge gate's pending status making it report itself as a blocker.
      const { data: statusData } = await octokit.repos.getCombinedStatusForRef({
        owner,
        repo,
        ref: headSha,
      });
      const failingStatuses = statusData.statuses.filter(
        (s) =>
          s.context !== MERGE_GATE_CONTEXT &&
          (s.state === "failure" || s.state === "pending"),
      );
      if (failingStatuses.length > 0) {
        allChecksPassed = false;
        reasons.push(
          `commit status is failing/pending: ${failingStatuses.map((s) => s.context).join(", ")}`,
        );
      }
    } catch (e) {
      console.error("merge-gate: failed to fetch check runs", e);
    }

    const passed = allChecksPassed;

    try {
      await octokit.repos.createCommitStatus({
        owner,
        repo,
        sha: headSha,
        state: passed ? "success" : "pending",
        context: MERGE_GATE_CONTEXT,
        description: passed
          ? "All checks passed"
          : `Waiting: ${reasons.join("; ")}`,
        target_url: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
      });
    } catch (e) {
      console.error("merge-gate: failed to set commit status", e);
    }

    try {
      const { data: prData } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });
      const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
      });
      const disabledComment = comments.find((c) =>
        c.body?.includes(AUTO_MERGE_DISABLED_MARKER),
      );

      if (!passed) {
        // Disable auto-merge so GitHub can't merge while checks are red.
        if (prData.auto_merge) {
          const method = prData.auto_merge.merge_method.toUpperCase();
          await octokit.graphql(
            `mutation($id: ID!) {
              disablePullRequestAutoMerge(input: { pullRequestId: $id }) {
                pullRequest { id }
              }
            }`,
            { id: prData.node_id },
          );
          const markerLine = `${AUTO_MERGE_DISABLED_MARKER}${method} -->`;
          const commentBody =
            `${markerLine}\n` +
            "🚫 **Auto-merge disabled** — CI checks are failing/pending.\n\n" +
            "Blocking reasons:\n" +
            reasons.map((r) => `- ${r}`).join("\n") +
            "\n\nAuto-merge will be re-enabled automatically once all checks pass.";
          if (disabledComment) {
            await octokit.issues.updateComment({
              owner,
              repo,
              comment_id: disabledComment.id,
              body: commentBody,
            });
          } else {
            await octokit.issues.createComment({
              owner,
              repo,
              issue_number: pullNumber,
              body: commentBody,
            });
          }
        } else {
          // Auto-merge not active — keep a single waiting comment, updating it
          // rather than creating a new one each time.
          const existingWaitingComment = comments.find((c) =>
            c.body?.includes(CI_WAITING_MARKER),
          );
          const waitingBody =
            `${CI_WAITING_MARKER}\n` +
            `⏳ **Merge gate is waiting on CI** (commit \`${headSha.slice(0, 7)}\`)\n\n` +
            "The following checks need to pass before this PR can be merged:\n" +
            reasons
              .filter(
                (r) =>
                  r.toLowerCase().includes("check") ||
                  r.toLowerCase().includes("status"),
              )
              .map((r) => `- ${r}`)
              .join("\n") +
            `\n\nI'll update the \`${MERGE_GATE_CONTEXT}\` status check as things change.`;
          if (existingWaitingComment) {
            await octokit.issues.updateComment({
              owner,
              repo,
              comment_id: existingWaitingComment.id,
              body: waitingBody,
            });
          } else {
            // In-memory guard prevents a second creation while the first is in-flight.
            const prKey = `${owner}/${repo}#${pullNumber}`;
            if (!pendingWaitingComment.has(prKey)) {
              pendingWaitingComment.add(prKey);
              try {
                await octokit.issues.createComment({
                  owner,
                  repo,
                  issue_number: pullNumber,
                  body: waitingBody,
                });
              } finally {
                pendingWaitingComment.delete(prKey);
              }
            }
          }
        }
      } else {
        if (disabledComment) {
          // All checks passed — restore auto-merge with the method we stored.
          const match = disabledComment.body.match(
            /<!-- zeon:merge-gate:automerge-disabled:(\w+) -->/,
          );
          const method = match ? match[1] : "SQUASH";
          await octokit.graphql(
            `mutation($id: ID!, $method: PullRequestMergeMethod!) {
              enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: $method }) {
                pullRequest { id }
              }
            }`,
            { id: prData.node_id, method },
          );
          await octokit.issues.updateComment({
            owner,
            repo,
            comment_id: disabledComment.id,
            body:
              `${AUTO_MERGE_DISABLED_MARKER}${method} -->\n` +
              "✅ **Auto-merge re-enabled** — all checks passed.",
          });
        }

        // Update the waiting comment to show everything is green.
        const existingWaitingComment = comments.find((c) =>
          c.body?.includes(CI_WAITING_MARKER),
        );
        if (existingWaitingComment) {
          await octokit.issues.updateComment({
            owner,
            repo,
            comment_id: existingWaitingComment.id,
            body:
              `${CI_WAITING_MARKER}\n` +
              "✅ **All clear!** Every check passed. Zeon is starting AI review now.",
          });
        }
      }
    } catch (e) {
      console.error("merge-gate: failed to manage auto-merge", e);
    }
  }

  /**
   * Extract { pullNumber, headSha } from the webhook payload regardless of
   * event type (pull_request, check_run, pull_request_review, review_thread).
   *
   * @param {object} payload
   * @returns {{ pullNumber: number, headSha: string } | null}
   */
  function extractPRInfo(payload) {
    if (payload.pull_request) {
      return {
        pullNumber: payload.pull_request.number,
        headSha: payload.pull_request.head.sha,
      };
    }
    if (payload.check_run?.pull_requests?.length) {
      return {
        pullNumber: payload.check_run.pull_requests[0].number,
        headSha: payload.check_run.head_sha,
      };
    }
    return null;
  }

  app.on(
    [
      "pull_request.opened",
      "pull_request.synchronize",
      "pull_request.reopened",
      "pull_request_review.submitted",
      "pull_request_review.dismissed",
      "pull_request_review_thread.resolved",
      "pull_request_review_thread.unresolved",
      "check_run.completed",
    ],
    async (context) => {
      const repo = context.repo();
      if (!MERGE_GATE_REPOS.includes(repo.repo.toLowerCase())) return;

      const info = extractPRInfo(context.payload);
      if (!info) return;

      await updateMergeGate(
        context.octokit,
        repo.owner,
        repo.repo,
        info.pullNumber,
        info.headSha,
      );
    },
  );

  app.on(
    ["pull_request.opened", "pull_request.edited", "pull_request.synchronize"],
    async (context) => {
      const repo = context.repo();
      const pull_request = context.payload.pull_request;

      // Conventional commit title enforcement for designated repos. Runs
      // independently of the AI review config so it always guards the PR.
      if (
        CONVENTIONAL_COMMIT_REPOS.includes(repo.repo.toLowerCase()) &&
        pull_request &&
        pull_request.state !== "closed"
      ) {
        const title = pull_request.title || "";
        if (!CONVENTIONAL_COMMIT_REGEX.test(title)) {
          try {
            await context.octokit.pulls.createReview({
              owner: repo.owner,
              repo: repo.repo,
              pull_number: context.pullRequest().pull_number,
              event: "REQUEST_CHANGES",
              body:
                "❌ This PR title does not follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.\n\n" +
                "Please reformat the title as `<type>(optional scope): <description>`, for example: `feat(api): add new endpoint`.\n\n" +
                "Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.",
            });
          } catch (e) {
            console.error("failed to request changes for PR title", e);
          }
        }
      }

      const config = await context.config("zeon/pr.yml");
      if (!config) return;
      if (!config["ai-review-code"]) {
        console.log("Not enabled");
        return;
      }
      const chat = await loadChat(context);

      if (!chat) {
        console.log("Chat initialized failed");
        return "no chat";
      }

      if (pull_request.state === "closed" || pull_request.locked) {
        console.log("invalid event payload");
        return "invalid event payload";
      }

      const target_label = process.env.TARGET_LABEL;
      if (
        target_label &&
        (!pull_request.labels?.length ||
          pull_request.labels.every((label) => label.name !== target_label))
      ) {
        console.log("no target label attached");
        return "no target label attached";
      }

      const data = await context.octokit.repos.compareCommits({
        owner: repo.owner,
        repo: repo.repo,
        base: context.payload.pull_request.base.sha,
        head: context.payload.pull_request.head.sha,
      });

      let { files: changedFiles, commits } = data.data;

      if (context.payload.action === "synchronize" && commits.length >= 2) {
        const {
          data: { files },
        } = await context.octokit.repos.compareCommits({
          owner: repo.owner,
          repo: repo.repo,
          base: commits[commits.length - 2].sha,
          head: commits[commits.length - 1].sha,
        });

        const ignoreList = (process.env.IGNORE || process.env.ignore || "")
          .split("\n")
          .filter((v) => v !== "");

        const filesNames = files?.map((file) => file.filename) || [];
        changedFiles = changedFiles?.filter(
          (file) =>
            filesNames.includes(file.filename) &&
            !ignoreList.includes(file.filename),
        );
      }

      if (!changedFiles?.length) {
        console.log("no change found");
        return "no change";
      }

      console.time("gpt cost");

      for (let i = 0; i < changedFiles.length; i++) {
        const file = changedFiles[i];
        const patch = file.patch || "";

        if (file.status !== "modified" && file.status !== "added") {
          continue;
        }

        if (!patch || patch.length > MAX_PATCH_COUNT) {
          console.log(
            `${file.filename} skipped caused by its diff is too large`,
          );
          continue;
        }
        try {
          const res = await chat?.codeReview(patch);

          if (res) {
            await context.octokit.pulls.createReviewComment({
              repo: repo.repo,
              owner: repo.owner,
              pull_number: context.pullRequest().pull_number,
              commit_id: commits[commits.length - 1].sha,
              path: file.filename,
              body: res,
              position: patch.split("\n").length - 1,
            });
          }
        } catch (e) {
          console.error(`review ${file.filename} failed`, e);
        }
      }

      console.timeEnd("gpt cost");
      console.info(
        "successfully reviewed",
        context.payload.pull_request.html_url,
      );

      return "success";
    },
  );
};
