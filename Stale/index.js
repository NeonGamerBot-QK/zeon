const createScheduler = require("probot-scheduler");
const Stale = require("./lib/stale");
module.exports = (app) => {
  const scheduler = createScheduler(app);
  const events = [
    "issue_comment",
    "issues",
    "pull_request",
    "pull_request_review",
    "pull_request_review_comment",
  ];
  app.on(events, unmark);
  app.on("schedule.repository", markAndSweep);
  async function unmark(context) {
    if (!context.isBot) {
      const stale = await forRepository(context);
      let issue = context.payload.issue || context.payload.pull_request;
      const type = context.payload.issue ? "issues" : "pulls";

      // Some payloads don't include labels
      if (!issue.labels) {
        try {
          issue = (await context.github.issues.get(context.issue())).data;
        } catch (error) {
          context.log("Issue not found");
        }
      }

      const staleLabelAdded =
        context.payload.action === "labeled" &&
        context.payload.label.name === stale.config.staleLabel;

      if (
        stale.hasStaleLabel(type, issue) &&
        issue.state !== "closed" &&
        !staleLabelAdded
      ) {
        await stale.unmarkIssue(type, issue);
      }
    }
  }

  async function markAndSweep(context) {
    const stale = await forRepository(context);
    await stale.markAndSweep("pulls");
    await stale.markAndSweep("issues");
  }

  async function forRepository(context) {
    let config = {
      daysUntilStale: 7, // 7 days
      daysUntilClose: 7, // 7 days
      markComment: ` This issue has been automatically marked as stale because it has not had
            recent activity. It will be closed if no further activity occurs. Thank you
            for your contributions.`,
      staleLabel: "stale",
      preform: true,
    };

    if (!config) {
      scheduler.stop(context.payload.repository);
      // Don't actually perform for repository without a config
      config = { perform: false };
    }

    config = Object.assign(config, context.repo({ logger: app.log }));

    return new Stale(context.github, config);
  }
};
