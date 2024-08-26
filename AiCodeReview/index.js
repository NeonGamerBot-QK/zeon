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
  const { ChatGPTAPI } = await import('chatgpt')
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
        body: `Seems you are using me but didn't get OPENAI_API_KEY seted in Variables/Secrets for this repo. Maybe @NeonGamerBot-QK should fix me.`,
      });
      return null;
    }
  };

  app.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async (context) => {
      const repo = context.repo();
      const config = await context.config("zeon/pr.yml")
      if (!config['ai-review-code']) {
        console.log(`Not enabled`)
        return;
      }
      const chat = await loadChat(context);

      if (!chat) {
        console.log("Chat initialized failed");
        return "no chat";
      }

      const pull_request = context.payload.pull_request;

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

          if (!!res) {
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
