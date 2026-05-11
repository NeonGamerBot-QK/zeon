// Deployments API example
// See: https://developer.github.com/v3/repos/deployments/ to learn more
const ServerConfig = {
  WebPanel: {
    host: process.env.WEB_HOST,
    port: process.env.WEB_PORT,
    // password: process.env.WEB_PORT,
    command: (env, script, args) =>
      `cd ~/pr_scripts && ${env} node ${script} ${args.join(" ")}`,
  },
};
const execCmd = require("./exec_command");
const OpenAI = require("openai");
const { GithubActionsClient } = require("github-actions-client");
const ai_client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});
const allowed_repos = [
  "https://github.com/NeonGamerBot-QK/test-d",
  "https://github.com/NeonGamerBot-QK/cat",
];
const deploy_repos = [
  {
    url: "https://github.com/NeonGamerBot-QK/cat",
    env: "PUBLIC_URL=/cat/pr/",
    templateUrl: "https://saahild.com/cat/pr/{pr}",
    type: "create_react",
    server: ServerConfig.WebPanel,
    outDir: "/home/saahild.com/public_html/cat",
  },
];
const fs = require("fs");
const { execSync, exec } = require("child_process");
const path = require("path");
const fetch = require("node-fetch");
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  // Your code here
  if (process.env.UPTIME_URL) {
    app.log("LOADED UPTIME");
    setInterval(() => {
      fetch(process.env.UPTIME_URL).then(() => {
        // app.log("declared UPTIME");
      });
    }, 50 * 1000);
  }
  app.log.info("Yay, the app was loaded!");
  app.on(["issues.opened"], async (ctx) => {
    app.log.info("new issue");
    app.log.info(ctx);
    //  const params = ctx.issue({body: 'Hello World!'})
    //   return ctx.github.issues.createComment(params)
    // return ctx.octokit.issues.createComment(
    //   ctx.issue({ body: "Hello World!" })
    // );
  });
  // app.on('')
  // todo intervaled pkg check for major and minor NO PATCH
  // setInterval(async () => {
  //   const octokit = await app.auth()
  //   // octokit.issues.c
  //   const reposToCheck = octokit.repos()

  // },  2*60*60 * 1_000)
  // app.auth().then(e => )
  app.on(["pull_request.opened", "pull_request.edited"], async (ctx) => {
    const { parser } = require("@conventional-commits/parser");
    try {
      const data = parser(ctx.payload.pull_request.title);
      const type = data.children[0].children.find(
        (e) => e.type == "type",
      ).value;
      const scope = data.children[0].children.find((e) => e.type == "scope");
      // if(ctx.octokit.ge )
      // const template = ctx.config('zeon/')
      try {
        const template = await ctx.octokit.rest.repos.getContent({
          owner: ctx.payload.repository.owner.login,
          repo: ctx.payload.repository.name,
          path: `.github/zeon/templates/pr/${type}-message.md`,
        });
        let templ = Buffer.from(template.data.content, "base64").toString();
        const Ctx = {
          pr_title: ctx.payload.pull_request.title,
          pr_scope: scope ? scope.value : "",
          issue_number: ctx.payload.pull_request.number,
          repo_owner: ctx.payload.repository.owner.login,
          repo_name: ctx.payload.repository.name,
          stamp: Date.now(),
          stamp_str: new Date().toString(),
        };
        let content = templ;
        Object.entries(Ctx).forEach(([key, value]) => {
          content = content.replaceAll(`{{${key}}}`, value);
        });
        setTimeout(() => {
          ctx.octokit.issues.createComment({
            repo: ctx.payload.repository.name,
            issue_number: ctx.payload.pull_request.number,
            // : ctx.payload.pull_request.number,
            owner: ctx.payload.repository.owner.login,
            body: content,
          });
        }, 450);
      } catch (e) {
        // console.error(e);
      }
    } catch (e) {
      console.error(e);
      // report error
      setTimeout(async () => {
        try {
          // console.clear()
          console.error(e, ctx.payload.pull_request.number);
          console.error(`Wow it broke`);
          await ctx.octokit.issues.createComment({
            repo: ctx.payload.repository.name,
            issue_number: ctx.payload.pull_request.number,
            // : ctx.payload.pull_request.number,
            owner: ctx.payload.repository.owner.login,

            body: `## Hey there and thank you for opening this pull request! 👋🏼
I require pull request titles to follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/) and it looks like your proposed title needs to be adjusted as  without it being in that order i can read your PR correctly.

  Available types:
   - feat: A new feature
   - fix: A bug fix
   - docs: Documentation only changes
   - style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
   - refactor: A code change that neither fixes a bug nor adds a feature
   - perf: A code change that improves performance
   - test: Adding missing tests or correcting existing tests
   - build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
   - ci: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
   - chore: Other changes that don't modify src or test files
   - revert: Reverts a previous commit
    `,
          });
        } catch (e) {}
      }, 250);
    }
  });
  app.on(["issues.closed"], async (ctx) => {
    app.log.info("closed issue");
    return ctx.octokit.issues.createComment(
      ctx.issue({ body: "## Thank you for your issue!" }),
    );
  });
  app.on(["pull_request.opened"], async (ctx) => {
    if (
      ctx.payload.repository.name == ctx.payload.repository.owner.login ||
      ["https://github.com/NeonGamerBot-QK/Vencord-builds"].some((u) =>
        u.includes(ctx.payload.repository.full_name),
      )
    ) {
      await ctx.octokit.issues.createComment({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.number,
        body: `## Please do not Make PR's\nPR's have been disabled in this repo if you want to contribute contact @NeonGamerBot-QK Directly via email.\nThanks.\n![No PR](https://raw.githubusercontent.com/NeonGamerBot-QK/NeonGamerBot-QK/main/no-pr.jpg)`,
      });
      await ctx.octokit.issues.update({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.number,
        state: "closed",
      });
      await ctx.octokit.issues.lock({
        owner: ctx.payload.repository.owner.login,
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.number,
        lock_reason: "off-topic",
      });
    }
  });
  app.on("pull_request.closed", (ctx) => {
    // if(!allowed_repos.includes(context.payload.repository.html_url)) {
    //   app.log.info("not running on " + context.payload.repository.html_url)
    //   return;
    // }
    //   app.log.info("IS IT A MERGE NO")
    //   const isMerged = ctx.payload.pull_request.merged
    //  const body = isMerged ? `# Thanks, ${ctx.payload.sender.login}!,\n Thanks for your contribution to this repository! and it will be gratefully excepted!` : `# Thanks, ${ctx.payload.sender.login}\n Thanks for submitting a PR!`
    //   const params = ctx.issue({ body });
    //         // Post a comment on the issue
    //         return ctx.octokit.issues.createComment(params);
  });
  app.onError((e) => {
    app.log.error(e.message);
    if (e.stack) {
      fs.writeFileSync("error.txt", e.stack);
    }
  });
  app.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async (context) => {
      // Creates a deployment on a pull request event
      // Then sets the deployment status to success
      // NOTE: this example doesn't actually integrate with a cloud
      // provider to deploy your app, it just demos the basic API usage.
      // app.log.info(context.payload.repository.html_url)

      if (!allowed_repos.includes(context.payload.repository.html_url)) {
        app.log.info("not running on " + context.payload.repository.html_url);
        return;
      }
      if (
        deploy_repos.some((e) => e.url === context.payload.repository.html_url)
      ) {
        const repoConfig = deploy_repos.find(
          (e) => e.url === context.payload.repository.html_url,
        );
        const branchName = context.payload.pull_request.head.ref; // HOW AM I SUPPOSED TO GET THE BRANCh!
        const prNumber = context.payload.pull_request.number;
        const repo = context.payload.repository.html_url;
        // const outDir = "out"
        app.log.info("Running CMD");
        const commandLine = repoConfig.server.command(
          repoConfig.env + prNumber || "",
          repoConfig.type,
          [
            `'${JSON.stringify({
              branchName,
              prNumber,
              repo,
              outDir: repoConfig.outDir,
            })}'`,
          ],
        );
        app.log.info("Command line: " + commandLine);
        execCmd(
          {
            user: process.env.SSH_USER,
            password: process.env.PASSWORD,
            host: ServerConfig.WebPanel.host,
            port: ServerConfig.WebPanel.port,
          },
          commandLine,
          app.log,
        ).then((e) => {
          const params = context.issue({
            body: `## Thanks for making a PR\n You can see a live version of this PR [here](${repoConfig.templateUrl.replace(
              "{pr}",
              prNumber,
            )})`,
          });

          // Post a comment on the issue
          return context.octokit.issues
            .createComment(params)
            .then((e) => app.log.info("DONE DONE!"));
        });
      }
      //  console.log(branch)

      // Probot API note: context.repo() => { username: 'hiimbex', repo: 'testing-things' }
      // const res = await context.octokit.repos.createDeployment(
      //   context.repo({
      //     ref: context.payload.pull_request.head.ref, // The ref to deploy. This can be a branch, tag, or SHA.
      //     task: "deploy", // Specifies a task to execute (e.g., deploy or deploy:migrations).
      //     auto_merge: true, // Attempts to automatically merge the default branch into the requested ref, if it is behind the default branch.
      //     required_contexts: [], // The status contexts to verify against commit status checks. If this parameter is omitted, then all unique contexts will be verified before a deployment is created. To bypass checking entirely pass an empty array. Defaults to all unique contexts.
      //     payload: {
      //       schema: "rocks!"
      //     }, // JSON payload with extra information about the deployment. Default: ""
      //     environment: "development", // Name for the target deployment environment (e.g., production, staging, qa)
      //     description: "My Probot App's first deploy!", // Short description of the deployment
      //     transient_environment: false, // Specifies if the given environment is specific to the deployment and will no longer exist at some point in the future.
      //     production_environment: false // Specifies if the given environment is one that end-users directly interact with.
      //   })
      // );

      //   const deploymentId = res.data.id;
      //   await context.octokit.repos.createDeploymentStatus(
      //     context.repo({
      //       deployment_id: deploymentId,
      //       state: "success", // The state of the status. Can be one of error, failure, inactive, pending, or success
      //       log_url: "https://saahild.com/pr/" + Math.random(), // The log URL to associate with this status. This URL should contain output to keep the user updated while the task is running or serve as historical information for what happened in the deployment.
      //       description: "My Probot App set a deployment status!", // A short description of the status.
      //       environment_url: "https://example.com/" + Math.random(), // Sets the URL for accessing your environment.
      //       auto_inactive: true // Adds a new inactive status to all prior non-transient, non-production environment deployments with the same repository and environment name as the created status's deployment. An inactive status is only added to deployments that had a success state.
      //     })
      //   );
    },
  );
  // on repo create event
  app.on(["repository.created"], (ctx) => {
    // ctx.isBot
    // ctx.octokit.actions.createOrUpdateRepoSecret({ owner: ctx.payload.repository.owner, encrypted_value: "", secret_name: "CP_HOST"})
  });
  app.on(["commit_comment.created"], async (ctx) => {
    const context = ctx;
    if (ctx.payload.sender.login.includes("zeon")) return; // ignore me

    const push = ctx.payload;
    console.log(push.comment);
    let msgBody = push.comment.body;
    if (msgBody.includes(".example_cmd")) {
      ctx.octokit.repos.createCommitComment({
        commit_sha: ctx.payload.comment.commit_id,
        repo: ctx.payload.repository.name,
        body: `> ${msgBody
          .split("\n")
          .join(
            "\n> ",
          )}\n\nHello World! (triggered from cmd: \`.example_cmd\`)`,
        owner: ctx.payload.repository.owner.login,
      });
    } else if (msgBody.includes(".zeon_ai")) {
      //todo convert to octokti
      const messages = [
        {
          role: "user",
          content: await ctx.octokit
            .request(
              "GET /repos/{owner}/{repo}/commits/{ref}",
              ctx.repo({
                ref: push.comment.commit_id,
                headers: {
                  "X-GitHub-Api-Version": "2022-11-28",
                  Accept: "application/vnd.github.patch",
                },
              }),
            )
            .then((e) => e.data),
        },
        // ,
        // {
        //   role: "user",
        //   content: `create a commit comment off patch .make it use new lines. You are zeon. Format it in MD . include no other extra commentary. Do not wrap it in a codeblock.`,
        // },
      ];
      // console.log(messages, fc.url + ".patch");

      const chatCompletion = await ai_client.chat.completions.create({
        messages,
        model: "gpt-4o",
      });
      console.log(
        chatCompletion.choices[0].message.content,
        "rip tokens used on this commit message",
      );
      ctx.octokit.repos.createCommitComment({
        commit_sha: ctx.payload.comment.commit_id,
        repo: ctx.payload.repository.name,
        body: chatCompletion.choices[0].message.content,
        owner: ctx.payload.repository.owner.login,
      });
    }
  });
  app.on(["pull_request.comment"], async (ctx) => {
    const context = ctx;
    if (ctx.payload.sender.login.includes("zeon")) return; // ignore me

    const push = ctx.payload;
    console.log(push.comment);
    let msgBody = push.comment.body;
    if (msgBody.includes(".example_cmd")) {
      ctx.octokit.repos.createCommitComment({
        commit_sha: ctx.payload.comment.commit_id,
        repo: ctx.payload.repository.name,
        body: `> ${msgBody
          .split("\n")
          .join(
            "\n> ",
          )}\n\nHello World! (triggered from cmd: \`.example_cmd\`)`,
        owner: ctx.payload.repository.owner.login,
      });
    } else if (msgBody.includes(".zeon_ai")) {
      //todo convert to octokti
      const messages = [
        {
          role: "user",
          content: await ctx.octokit
            .request(
              "GET /repos/{owner}/{repo}/commits/{ref}",
              ctx.repo({
                ref: push.comment.commit_id,
                headers: {
                  "X-GitHub-Api-Version": "2022-11-28",
                  Accept: "application/vnd.github.patch",
                },
              }),
            )
            .then((e) => e.data),
        },
        // ,
        // {
        //   role: "user",
        //   content: `create a commit comment off patch .make it use new lines. You are zeon. Format it in MD . include no other extra commentary. Do not wrap it in a codeblock.`,
        // },
      ];
      // console.log(messages, fc.url + ".patch");

      const chatCompletion = await ai_client.chat.completions.create({
        messages,
        model: "gpt-4o",
      });
      console.log(
        chatCompletion.choices[0].message.content,
        "rip tokens used on this commit message",
      );
      ctx.octokit.repos.createCommitComment({
        commit_sha: ctx.payload.comment.commit_id,
        repo: ctx.payload.repository.name,
        body: chatCompletion.choices[0].message.content,
        owner: ctx.payload.repository.owner.login,
      });
    }
  });
  app.on(["push"], async (ctx) => {
    const context = ctx;
    if (ctx.payload.pusher.name.includes("zeon")) return; // ignore my commitss
    const push = ctx.payload;

    // robot.log.info(context, context.github)

    const compare = await ctx.octokit.repos.compareCommits(
      context.repo({
        base: push.before,
        head: push.after,
      }),
    );

    const branch = push.ref.replace("refs/heads/", "");
    compare.data.files.forEach(async (file) => {
      console.log(file);
      if (file.filename.includes(".example_cmd")) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: `chore(cleanup): Delete ${file.filename} file`,
          }),
        );
      } else if (file.filename.includes(".create_notes_list")) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: `chore(cleanup): Delete ${file.filename} file`,
          }),
        );
        if (ctx.payload.repository.name !== "my-notes") {
          ctx.octokit.repos.createCommitComment({
            commit_sha: ctx.payload.after,
            repo: ctx.payload.repository.name,
            body: `Please use this in the right [repo](https://github.com/NeonGamerBot-QK/my-notes)`,
            owner: ctx.payload.repository.owner.name,
          });
        } else {
          // assuming there are NO new copies this works otherwise will crash and give up
          try {
            let str_of_repos = [];
            const repos =
              await context.octokit.rest.repos.listForAuthenticatedUser({
                per_page: 100,
                username: "NeonGamerBot-QK",
              });
            for (const e of repos.data) {
              try {
                if (e.archived || e.fork) continue;
                if (e.name == "jumaos") continue;
                if (e.topics && e.topics.includes("skip-check")) continue;
                const metaIssue = (
                  await context.octokit.issues.listForRepo({
                    owner: e.owner.login,
                    repo: e.name,
                    state: "open",
                    labels: "meta",
                  })
                ).data;
                const metaIssueUrl = metaIssue.find((e) =>
                  e.user.login.includes("zeon"),
                );
                // console.log([metaIssueUrl])
                str_of_repos.push({
                  str: `[${e.full_name}](https://github.com/${e.full_name}) - ${
                    metaIssueUrl?.html_url ?? "No meta issue"
                  }`,
                  v: e.visibility == "public" ? 0 : 1,
                });
              } catch (e) {
                console.error(e);
              }
            }
            await new Promise((r) => setTimeout(r, 1500));
            console.log(str_of_repos.filter((r) => r.v == 1).length);
            await context.octokit.repos.createOrUpdateFileContents(
              context.repo({
                path: `private_repos.md`,
                message: `feat(private_repos): + create private repos`,
                content: Buffer.from(
                  `## Private Repos\n` +
                    str_of_repos
                      .filter((r) => r.v == 1)
                      .map((e) => e.str)
                      .join("\n<br />"),
                ).toString("base64"),
              }),
            );
            await context.octokit.repos.createOrUpdateFileContents(
              context.repo({
                path: `public/repos.md`,
                message: `feat(public_repos): + create public repos`,
                content: Buffer.from(
                  `## Public Repos\n` +
                    str_of_repos
                      .filter((r) => r.v == 0)
                      .map((e) => e.str)
                      .join("\n<br />"),
                ).toString("base64"),
              }),
            );
          } catch (e) {
            // welp gg
            console.error(e);
          }
        }
      } else if (file.filename.includes(".create_readme")) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: "chore(cleanup): Delete .create_readme file",
          }),
        );
        const config = context.config("zeon/readme.yml") || {};
        let example_readme = fs.readFileSync("example_readme.md").toString();
        let is_prob_node = false;
        let pkg_json = {};
        // try to get package.json file content
        try {
          const pkg_content = await context.octokit.repos.getContent(
            ctx.repo({
              path: `package.json`,
            }),
          );
          pkg_json = JSON.parse(
            Buffer.from(pkg_content.data.content, "base64").toString(),
          );
          is_prob_node = true;
        } catch (e) {
          is_prob_node = false;
        }
        async function fileExists(path) {
          try {
            await context.octokit.repos.getContent(ctx.repo({ path }));
            return true;
          } catch (err) {
            if (err.status === 404) return false;
            throw err; // rethrow unexpected errors
          }
        }
        async function findFileRecursive(filename, path = "") {
          const contents = await context.octokit.repos.getContent(
            ctx.repo({ path }),
          );
          const items = Array.isArray(contents.data)
            ? contents.data
            : [contents.data];

          for (const item of items) {
            if (item.type === "file" && item.name === filename) {
              return item.path; // return full path like "assets/icons/icon.png"
            }
            if (item.type === "dir") {
              const found = await findFileRecursive(item.path);
              if (found) return found;
            }
          }

          return null;
        }
        const hasScreenshot = await findFileRecursive("screenshot.png");
        const hasIcon = await findFileRecursive("icon.png");
        const repoInfo = await context.octokit.repos
          .get(ctx.repo())
          .then((d) => d.data);

        // Object.entries().forEach(([key, value]) => {
        //   example_readme = example_readme
        //     .replaceAll(key, value)
        //     .replaceAll(`{${key}}`, value);
        // });
        example_readme = ejs.render(example_readme, {
          github_username:
            config.github_username || ctx.payload.repository.owner.login,
          repo_name: config.repo_name || ctx.payload.repository.name,
          ...config,
          is_node: is_prob_node,
          pkg: pkg_json,
          hasScreenshot,
          hasIcon,
          repoInfo,
        });
        try {
          context.octokit.repos.createOrUpdateFileContents(
            context.repo({
              path: `README.md`,
              message: `enhancement(readme): Create Readme.md`,
              content: Buffer.from(example_readme).toString("base64"),
            }),
          );
        } catch (e) {
          console.error(e);
          console.log(0, `failed`);
        }
      } else if (file.filename.includes(".create_mit")) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: `chore(cleanup): Delete ${file.filename} file`,
          }),
        );
        const mitData = require("mit")(require("./package.json").author);
        try {
          context.octokit.repos.createOrUpdateFileContents(
            context.repo({
              path: `LICENSE.txt`,
              message: `enhancement(LICENSE): Create LICENSE.txt`,
              content: Buffer.from(mitData).toString("base64"),
            }),
          );
        } catch (e) {
          console.error(e);
          console.log(1, `failed`);
        }
      } else if (file.filename.includes(".create_citation")) {
        // @see https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files
        const repoCreatedYear = new Date(
          ctx.payload.repository.created_at * 1000,
        )
          .toISOString()
          .split("T")[0];
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: `chore(cleanup): Delete ${file.filename} file`,
          }),
        );
        try {
          const fileData = `cff-version: 1.2.0
message: "If you use this software, please cite it as below."
authors:
  - family-names: "Saahil"
    given-names: "Dutta"
    orcid: "https://orcid.org/0009-0008-6830-1025"
title: "${ctx.payload.repository.name}"
version: 0.0.0
date-released: ${repoCreatedYear}
url: "${ctx.payload.repository.html_url}"`;
          await context.octokit.repos.createOrUpdateFileContents(
            context.repo({
              path: `CITATION.cff`,
              message: `ci(git): Create citations`,
              content: Buffer.from(fileData).toString("base64"),
            }),
          );
        } catch (e) {
          console.error(e);
          console.log(6, `failed`);
        }
      } else if (file.filename.includes(".amp_code")) {
        // Handle .amp_code files - reads content and uses amp-sdk to create code in repo
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        const fileContent = Buffer.from(
          content.data.content,
          "base64",
        ).toString();

        // Delete the .amp_code command file
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: `chore(cleanup): Delete ${file.filename} file`,
          }),
        );

        try {
          const { execute } = require("@sourcegraph/amp-sdk");
          const ampPrompt = fileContent.trim();

          // Execute amp-sdk with the prompt from the file content
          let ampResult = null;
          for await (const message of execute({ prompt: ampPrompt })) {
            if (message.type === "result" && !message.is_error) {
              ampResult = message.result;
              break;
            }
          }

          // Push the created code to the repository
          if (ampResult && ampResult.files) {
            for (const [filePath, generatedContent] of Object.entries(
              ampResult.files,
            )) {
              await ctx.octokit.repos.createOrUpdateFileContents(
                ctx.repo({
                  path: filePath,
                  message: `feat(amp): Generated code via amp-sdk`,
                  content: Buffer.from(generatedContent).toString("base64"),
                }),
              );
            }
          }

          console.log("Successfully created and pushed code via amp-sdk");
        } catch (e) {
          console.error("Error processing .amp_code file:", e);
        }
      } else if (file.filename.includes(".create_funding")) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: `chore(cleanup): Delete ${file.filename} file`,
          }),
        );
        try {
          context.octokit.repos.createOrUpdateFileContents(
            context.repo({
              path: `.github/FUNDING.yml`,
              message: `ci(git): Create funding.yml`,
              content: Buffer.from(
                `# Autogenerated file. \n# Zeon created this file.\nko_fi: saahil\ngithub: [NeonGamerBot-QK]`,
              ).toString("base64"),
            }),
          );
        } catch (e) {
          console.error(e);
          console.log(2, `failed`);
        }
      } else if (file.filename.endsWith(".create_tts_file")) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        const [fileOutName, ...contentSplits] = Buffer.from(
          content.data.content,
          "base64",
        )
          .toString()
          .split(" ");
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: `chore(cleanup): Delete ${file.filename} file`,
          }),
        );
        if (!fileOutName) return;
        if (contentSplits.length <= 0) return;
        try {
          const mp3 = await ai_client.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: contentSplits.join(" ").slice(0, 4096),
          });
          context.octokit.repos.createOrUpdateFileContents(
            context.repo({
              path: fileOutName,
              message: `assets(mp3): Create TTS file`,
              content: Buffer.from(await mp3.arrayBuffer()).toString("base64"),
            }),
          );
        } catch (e) {
          console.error(`tts failed`, e);
        }
      } else if (file.filename.endsWith(".zeon.template")) {
        const realFilename = file.filename.slice(
          0,
          file.filename.length - ".zeon.template".length,
        );
        const ejsParams = {
          payload: ctx.payload,
          config: {
            delete_template_file: Math.random(),
          },
        };
        const filee = await ctx.octokit.rest.repos
          .getContent(
            ctx.repo({
              path: file.filename,
            }),
          )
          .then((e) => e.data);
        try {
          await ctx.octokit.rest.repos.createOrUpdateFileContents(
            ctx.repo({
              path: realFilename,
              message: "[ZEON] Create file",
              content: Buffer.from(".").toString("base64"),
            }),
          );
        } catch (e) {}
        const out = require("ejs").render(
          Buffer.from(filee.content, "base64").toString(),
          ejsParams,
        );
        try {
          await ctx.octokit.rest.repos.createOrUpdateFileContents(
            ctx.repo({
              path: realFilename,
              message: `[ZEON] Template file content`,
              content: Buffer.from(out).toString("base64"),
              sha: await ctx.octokit.rest.repos
                .getContent(ctx.repo({ path: realFilename }))
                .then((e) => e.data.sha),
            }),
          );
        } catch (e) {
          console.error(e);
        }
      }
    });
  });
  app.on(["pull_request.opened"], async (ctx) => {
    const context = ctx;
    const push = ctx.payload;
    const config = await ctx.config("zeon/pr.yml");
    if (!config) return;
    console.log(config);
    console.log(
      `what to do next... (use payload to get patch, get patch to get tge prompted ans)`,
    );
    if (config["ai-review"]) {
      const { data: diff } = await context.octokit.rest.pulls.get(
        context.repo({
          pull_number: push.pull_request.number,
          mediaType: {
            format: "patch",
          },
        }),
      );
      // console.log(diff);
      console.log(`ok now ai after this test`);
      const messages = [
        {
          role: "user",
          content: diff,
        },
        {
          role: "user",
          // prompt
          //Decide if that file should be merged into the main branch. The rules are: {rules} . write why you are accepting/declining it and format it in markdown. Format in JSON with a properties which has the verdict and one with the summary with new lines.
          content:
            `Decide if that file should be merged into the main branch.  write why you are accepting/declining it and format it in markdown. Format in JSON with a properties which has the verdict and one with the summary with new lines. The rules are: {rules}. No Code Block.`.replace(
              "{rules}",
              config["ai-review"]["rules"],
            ),
        },
      ];

      const chatCompletion = await ai_client.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
      });
      console.log(
        chatCompletion.choices[0].message.content,
        "rip tokens used on this commit message",
      );
      const out = JSON.parse(chatCompletion.choices[0].message.content);
      ctx.octokit.issues.createComment(
        ctx.repo({
          body:
            out.summary +
            `<details>
           <summary>Disclosure</summary>
           <p>The above is AI generated</p>
           ${
             config["ai-review"]["allow-it-to-create-action"]
               ? `<p>The AI's actions will be taken and can be taken back later. </p>`
               : `<p>The AI's actions verdict was {verdict} but no action will be taken</p>`.replace(
                   "{verdict}",
                   out.verdict,
                 )
           }
         </details>`,

          issue_number: ctx.payload.pull_request.number,
        }),
      );
      if (config["ai-review"]["allow-it-to-create-action"]) {
        switch (out.verdict) {
          case "decline":
            await ctx.octokit.issues.update({
              owner: ctx.payload.repository.owner.login,
              repo: ctx.payload.repository.name,
              issue_number: ctx.payload.number,
              state: "closed",
            });
            break;
          case "accept":
            //todo
            // @see https://github.com/juliangruber/approve-pull-request-action/blob/master/index.js#L21-L25
            await ctx.octokit.rest.pulls.createReview({
              owner: ctx.payload.repository.owner.login,
              repo: ctx.payload.repository.name,
              pull_number: ctx.payload.pull_request.number,
              event: "APPROVE",
            });
            break;
        }
      }
      // examples: (not public)
      // approved: https://github.com/NeonGamerBot-QK/test-d/pull/25
      // declined: https://github.com/NeonGamerBot-QK/test-d/pull/26
    }
  });
  app.on(["push"], async (ctx) => {
    const context = ctx;
    if (ctx.payload.pusher.name.includes("zeon")) return; // ignore my commitss
    const push = ctx.payload;
    const branch = push.ref.replace("refs/heads/", "");
    const config = (await context.config("zeon/commit.yml")) || {};
    console.log(config, `COMMIT_CONGIF_CONFIG`);
    if (config.aicomment) {
      console.log(`sad`);
    }
    if (config.conventionalcommits) {
      const fcs = push.commits;
      const timeStart = new Date();
      try {
        const { parser } = require("@conventional-commits/parser");

        const data = parser(ctx.payload.pull_request.title);
        const type = data.children[0].children.find(
          (e) => e.type == "type",
        ).value;
        const scope = data.children[0].children.find((e) => e.type == "scope");
        await context.octokit.checks.create(
          context.repo({
            name: "Conventional Commits",
            // head_branch: context.payload.head_commit.ref,
            head_sha: push.head_commit.id,
            status: "completed",
            // head_sha: context.payload,
            started_at: timeStart,
            conclusion: "success",
            completed_at: new Date(),
            // output: {
            //   title: "CC",
            //   summary: "All commits are in correct formating.",
            // },
          }),
        );
      } catch (e) {
        console.error("cry", e);

        await context.octokit.checks.create(
          context.repo({
            name: "Conventional Commits",
            head_sha: push.head_commit.id,
            status: "completed",
            started_at: timeStart,
            conclusion: "action_required",
            completed_at: new Date(),
            output: {
              title: "CC",
              summary: `## Hey there and thank you for opening this pull request! 👋🏼
I require pull request titles to follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/) and it looks like your proposed title needs to be adjusted as  without it being in that order i can read your PR correctly.

  Available types:
   - feat: A new feature
   - fix: A bug fix
   - docs: Documentation only changes
   - style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
   - refactor: A code change that neither fixes a bug nor adds a feature
   - perf: A code change that improves performance
   - test: Adding missing tests or correcting existing tests
   - build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
   - ci: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
   - chore: Other changes that don't modify src or test files
   - revert: Reverts a previous commit
   `,
            },
            actions: [
              {
                label: "Ignore Conv Commits",
                description: "would set status to passing",
                identifier: "override",
              },
            ],
          }),
        );
      }
    }
    if (config.autocodeowner) {
      const fcs = push.commits;

      console.log(`#codeowners`);
      fcs.forEach(async (fc) => {
        const compare = await ctx.octokit.repos.compareCommits(
          context.repo({
            base: push.before,
            head: push.after,
          }),
        );
        const filesMatched = compare.data.files.filter((f) =>
          f.blob_url.includes(fc.id),
        );
        try {
          await ctx.octokit.repos.createOrUpdateFileContents(
            ctx.repo({
              path: ".github/CODEOWNERS",
              message: `ci(git): create codeowners`,
              content: Buffer.from(
                `# Autogenerated. Edit at ur own risk. \n# Zeon created this codeowners file. All instances of zeon will maintain it and so will neon.\n# TO get zeon to approve changes on pr with its files neon must approve it and run \`.zeon_approve\` in the PR\n.github/CODEOWNERS @zeon-neon @NeonGamerBot-QK\n# Zeons directory\n/zeon/ @zeon-neon`,
              ).toString("base64"),
            }),
          );
        } catch (e) {}
        // line above is incase it fails because the file exists OR codeowners says no
        const currentFileContent = await ctx.octokit.repos
          .getContent(
            ctx.repo({
              path: ".github/CODEOWNERS",
              ref: branch,
            }),
          )
          .then((e) => {
            e.data.content = Buffer.from(e.data.content, "base64").toString();
            return e;
          });
        let appendToCodeOwners = filesMatched
          .map((f) => `${f.filename} @${ctx.payload.pusher.name}`)
          .join("\n");
        try {
          await ctx.octokit.repos.createOrUpdateFileContents(
            ctx.repo({
              path: ".github/CODEOWNERS",
              message: `ci(git): update codeowners`,
              sha: currentFileContent.data.sha,
              content: Buffer.from(
                [
                  ...new Map(
                    (
                      currentFileContent.data.content +
                      "\n" +
                      appendToCodeOwners
                    ).split("\n"),
                  ),
                ].join("\n"),
              ).toString("base64"),
            }),
          );
        } catch (e) {
          // can fail when, updating its own codeowners file.
        }
      });
    }
  });
  app.on(["push"], async (ctx) => {
    const context = ctx;
    if (ctx.payload.pusher.name.includes("zeon")) return; // ignore my commitss
    const push = ctx.payload;
    // console.log(push)

    // );
    const branch = push.ref.replace("refs/heads/", "");

    if (push.commits.some((c) => c.message.includes("zeon:test"))) {
      const fc = push.commits.find((c) => c.message.includes("zeon:test"));
      console.log(fc, "found commit");
      ctx.octokit.repos.createCommitComment({
        commit_sha: ctx.payload.after,
        repo: ctx.payload.repository.name,
        body: `Hello World! (triggered from cmd: \`zeon:test\`)`,
        owner: ctx.payload.repository.owner.name,
      });
    }
    console.log(ctx.payload.pusher, "pusher info");
    if (
      push.commits.some((c) => c.message.includes("zeon:codeowners")) &&
      ctx.payload.pusher.name
    ) {
      const fc = push.commits.find((c) =>
        c.message.includes("zeon:codeowners"),
      );
      console.log(`#codeowners`);
      // ctx.octokit.repos.createCommitComment({
      //   commit_sha: ctx.payload.after,
      //   repo: ctx.payload.repository.name,
      //   body: `Hello World! (triggered from cmd: \`zeon:test\`)`,
      //   owner: ctx.payload.repository.owner.name,
      // })
      const compare = await ctx.octokit.repos.compareCommits(
        context.repo({
          base: push.before,
          head: push.after,
        }),
      );
      const filesMatched = compare.data.files.filter((f) =>
        f.blob_url.includes(fc.id),
      );
      try {
        await ctx.octokit.repos.createOrUpdateFileContents(
          ctx.repo({
            path: ".github/CODEOWNERS",
            message: `ci(git): create codeowners`,
            content: Buffer.from(
              `# Autogenerated. Edit at ur own risk. \n# Zeon created this codeowners file. All instances of zeon will maintain it and so will neon.\n# TO get zeon to approve changes on pr with its files neon must approve it and run \`.zeon_approve\` in the PR\n.github/CODEOWNERS @zeon-neon @NeonGamerBot-QK\n# Zeons directory\n/zeon/ @zeon-neon`,
            ).toString("base64"),
          }),
        );
      } catch (e) {}
      // line above is incase it fails because the file exists OR codeowners says no
      const currentFileContent = await ctx.octokit.repos
        .getContent(
          ctx.repo({
            path: ".github/CODEOWNERS",
            ref: branch,
          }),
        )
        .then((e) => {
          e.data.content = Buffer.from(e.data.content, "base64").toString();
          return e;
        });
      let appendToCodeOwners = filesMatched
        .map((f) => `${f.filename} @${ctx.payload.pusher.name}`)
        .join("\n");
      await ctx.octokit.repos.createOrUpdateFileContents(
        ctx.repo({
          path: ".github/CODEOWNERS",
          message: `ci(git): update codeowners`,
          sha: currentFileContent.data.sha,
          content: Buffer.from(
            currentFileContent.data.content + "\n" + appendToCodeOwners,
          ).toString("base64"),
        }),
      );
      // console.log(`codeowners`, compare.data.files);
    }
    if (push.commits.some((c) => c.message.includes("zeon:ai_comment"))) {
      const fc = push.commits.find((c) =>
        c.message.includes("zeon:ai_comment"),
      );
      //todo convert to octokti
      const messages = [
        {
          role: "user",
          content: await ctx.octokit
            .request(
              "GET /repos/{owner}/{repo}/commits/{ref}",
              ctx.repo({
                ref: fc.id,
                headers: {
                  "X-GitHub-Api-Version": "2022-11-28",
                  Accept: "application/vnd.github.patch",
                },
              }),
            )
            .then((e) => e.data),
        },
        {
          role: "user",
          content: `create a commit comment off patch .make it use new lines. You are zeon. Format it in MD . include no other extra commentary. Do not wrap it in a codeblock.`,
        },
      ];
      console.log(messages, fc.url + ".patch");

      const chatCompletion = await ai_client.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
      });
      console.log(
        chatCompletion.choices[0].message.content,
        "rip tokens used on this commit message",
      );
      ctx.octokit.repos.createCommitComment({
        commit_sha: ctx.payload.after,
        repo: ctx.payload.repository.name,
        body: chatCompletion.choices[0].message.content,
        owner: ctx.payload.repository.owner.name,
      });
      // chatCompletion
    }
  });
  app.on(["push"], async (ctx) => {
    const context = ctx;
    if (ctx.payload.pusher.name.includes("zeon")) return; // ignore my commitss
    const push = ctx.payload;

    // robot.log.info(context, context.github)

    const compare = await ctx.octokit.repos.compareCommits(
      context.repo({
        base: push.before,
        head: push.after,
      }),
    );

    const branch = push.ref.replace("refs/heads/", "");
    compare.data.files.forEach(async (file) => {
      console.log(file);
      if (file.filename.includes(".DS_Store")) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(
          ctx.repo({
            sha: content.data.sha,
            path: file.filename,
            branch,
            message: "chore(cleanup): Delete .DS_STORE files",
          }),
        );
      }
    });
  });
  // app.on(['push'], async (ctx) => {
  //   // ctx.octokit.issues.create(ctx.issue({
  //   //   body: 'test',
  //   // }))
  //   const push = context.payload

  //   // robot.log.info(context, context.github)

  //       const compare = await context.octokit.repos.compareCommits(ctx.repo({
  //         base: push.before,
  //         head: push.after
  //       }))
  //       const branch = push.ref.replace('refs/heads/', '')
  //       return Promise.all(compare.data.files.map(async file => {
  //         if (!exclude.includes(file.filename)) {
  //           const content = await ctx.octokit.repos.getContent(ctx.repo({
  //             path: file.filename,
  //             ref: branch
  //           }))
  //           const text = Buffer.from(content.data.content, 'base64').toString()
  //           Object.assign(linterItems, {cwd: '', fix: true, filename: file.filename})

  //             if (err) {
  //               throw new Error(err)
  //             }
  //             return Promise.all(results.results.map(result => {
  //               if (result.output) {
  //                 // Checks that we have a fixed version and the file isn't part of the exclude list
  //               //   context.octokit.repos.createOrUpdateFileContents()
  //                 ctx.octokit.repos.createOrUpdateFileContents(ctx.repo({
  //                   path: file.filename,
  //                   message: `Fix lint errors for ${file.filename}`,
  //                   content: Buffer.from(result.output).toString('base64'),
  //                   sha: content.data.sha,
  //                   branch
  //                 }))
  //               }
  //             }))

  //         }
  //       }))
  // })

  app.on("push", (ctx) => {
    console.log(`debug: send post`);
    fetch("https://slack.mybot.saahild.com/github-cb-for-slack", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env["SLZ_AUTH"],
      },
      body: JSON.stringify({
        repo_name: ctx.payload.repository.name,
        commit_id: ctx.payload.after,
        commit_url: `https://github.com/${
          ctx.payload.repository.owner.login || "NeonGamerBot-QK"
        }/${ctx.payload.repository.name}/commits/${ctx.payload.after}`,
        is_zeon: ctx.payload.pusher.name.includes("zeon"),
      }),
    })
      .catch(console.error)
      .then((r) => {
        r.text().then(console.log);
      });
    if (ctx.payload.repository.name !== "zeon") {
      app.log(`Not my repo to pull from`);
      return;
    }

    if (ctx.isBot) {
      app.log(`Not writing comments for bot`);
      return;
    }
    exec(`git pull`, (err, stdout, stderr) => {
      // app.log(stdout, stderr)
      if (err) return app.log(err);
      // if(stderr.length > 10) {
      //   app.log(stderr)
      //   return;
      // }
      // console.log(ctx.payload)
      ctx.octokit.repos
        .createCommitComment({
          commit_sha: ctx.payload.after,
          repo: ctx.payload.repository.name,
          body: `\`\`\`diff\n${stdout}\`\`\``,
          owner: ctx.payload.repository.owner.name,
        })
        .then(() => {
          app.log("App Shuttding down (5s)");

          setTimeout(() => {
            app.log("App Shuttding down (EXIT)");
            process.exit(0);
          }, 5_000);
        });
    });
  });
  app.on("push", async (ctx) => {
    // setup utils if not done
    try {
      await ctx.octokit.rest.repos
        .addCollaborator(
          ctx.repo({
            username: `zeon-neon`,
          }),
        )
        .then((r) => {
          fetch(
            "https://api.github.com/user/repository_invitations/" + r.data.id,
            {
              method: "PATCH",
              headers: {
                Accept: "application/vnd.github+json",
                Authorization: "Bearer " + process.env.ZEON_USER_TOKEN,
                "X-GitHub-Api-Version": "2022-11-28",
              },
            },
          );
        });
    } catch (e) {}
    try {
      const ghc = new GithubActionsClient(
        ctx.payload.repository.owner.login,
        ctx.payload.repository.name,
        process.env.ZEON_USER_TOKEN,
      );
      ghc.CreateOrUpdateSecret(`INJECTED_ENV`, `1`);
      Object.entries(
        require("dotenv").parse(fs.readFileSync(`./.env.repo`)),
      ).forEach(([key, value]) => {
        ghc.CreateOrUpdateSecret(key, value);
      });
    } catch (e) {}
  });
  // In-memory guard so concurrent events can't both pass the listReviews
  // dedup check before either has actually posted a review.
  const reviewedPRSHAs = new Set();

  /**
   * Runs all pre-merge gates, then AI-reviews and merges (or requests changes
   * on) a single PR. Safe to call from multiple event handlers.
   *
   * @param {import('@octokit/rest').Octokit} octokit
   * @param {object} log - Probot logger
   * @param {object} repository - GitHub repository payload object
   * @param {object} fullPr - Full PR object from pulls.get
   */
  async function reviewAndMaybeMergePR (octokit, log, repository, fullPr) {
    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = fullPr.number;

    if (fullPr.draft || fullPr.state !== "open") return;

    // Synchronous guard must come before any await so concurrent handlers
    // can't both pass the dedup check before either posts a review.
    const reviewKey = `${repository.full_name}#${prNumber}@${fullPr.head.sha}`;
    if (reviewedPRSHAs.has(reviewKey)) {
      log.info(`Skipping PR #${prNumber} — concurrent review already in-flight for ${fullPr.head.sha}`);
      return;
    }
    reviewedPRSHAs.add(reviewKey);

    // API-based dedup: survives process restarts where the in-memory set was cleared.
    try {
      const { data: existingReviews } = await octokit.pulls.listReviews({
        owner, repo, pull_number: prNumber, per_page: 100,
      });
      const alreadyReviewed = existingReviews.some(
        (r) =>
          r.user &&
          r.user.login === "zeon-neon" &&
          r.commit_id === fullPr.head.sha &&
          (r.state === "CHANGES_REQUESTED" || r.state === "APPROVED"),
      );
      if (alreadyReviewed) {
        log.info(`Skipping PR #${prNumber} — zeon already reviewed ${fullPr.head.sha}`);
        return;
      }
    } catch (e) {
      log.error(`Failed to list reviews for PR #${prNumber}: ${e.message}`);
    }

    const doNotMergeTag = "[do-not-automerge]";
    if (
      fullPr.title.toLowerCase().includes(doNotMergeTag) ||
      (fullPr.body && fullPr.body.toLowerCase().includes(doNotMergeTag))
    ) {
      log.info(`Skipping PR #${prNumber} — [do-not-automerge] tag present`);
      try {
        await octokit.issues.createComment({
          owner, repo, issue_number: prNumber,
          body: "I'm not merging this one — `[do-not-automerge]` is set.",
        });
      } catch (e) {}
      return;
    }

    // Verify every CI check has passed — a single check_suite firing with
    // "success" doesn't mean all checks passed.
    try {
      const { data: checkRunsData } = await octokit.checks.listForRef({
        owner, repo, ref: fullPr.head.sha, per_page: 100,
      });
      const failing = checkRunsData.check_runs.filter(
        (run) =>
          run.name !== "zeon/merge-gate" &&
          (run.status !== "completed" ||
            !["success", "neutral", "skipped"].includes(run.conclusion)),
      );
      if (failing.length > 0) {
        log.info(`Skipping PR #${prNumber} — ${failing.length} failing/pending check(s): ${failing.map((r) => r.name).join(", ")}`);
        return;
      }
    } catch (e) {
      log.error(`Failed to verify checks for PR #${prNumber}: ${e.message}`);
      return;
    }

    // Require Copilot to have reviewed AND all its threads resolved.
    try {
      const copilotResult = await octokit.graphql(
        `query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $number) {
              reviewThreads(first: 100) {
                nodes {
                  isResolved
                  comments(first: 1) {
                    nodes { author { login } }
                  }
                }
              }
            }
          }
        }`,
        { owner, repo, number: prNumber },
      );
      const threads = copilotResult.repository.pullRequest.reviewThreads.nodes;
      const copilotThreads = threads.filter((t) =>
        t.comments.nodes.some((c) => /copilot/i.test(c.author?.login || "")),
      );
      if (copilotThreads.length === 0) {
        log.info(`Skipping PR #${prNumber} — Copilot has not reviewed yet`);
        return;
      }
      const unresolved = copilotThreads.filter((t) => !t.isResolved);
      if (unresolved.length > 0) {
        log.info(`Skipping PR #${prNumber} — ${unresolved.length} unresolved Copilot thread(s)`);
        return;
      }
    } catch (e) {
      log.error(`Failed to check Copilot threads for PR #${prNumber}: ${e.message}`);
      return;
    }

    // Fetch the diff/patch for AI review.
    let diff;
    try {
      ({ data: diff } = await octokit.rest.pulls.get({
        owner, repo, pull_number: prNumber, mediaType: { format: "patch" },
      }));
    } catch (e) {
      log.error(`Failed to fetch diff for PR #${prNumber}: ${e.message}`);
      return;
    }

    // Run AI review.
    let out;
    try {
      const chatCompletion = await ai_client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: String(diff) },
          {
            role: "user",
            content:
              'Review this pull request diff. Decide if it should be merged into the main branch. Respond ONLY in JSON with two properties: "verdict" (either "accept" or "decline") and "summary" (your markdown explanation). No code block.',
          },
        ],
      });
      out = JSON.parse(chatCompletion.choices[0].message.content);
    } catch (e) {
      log.error(`AI review failed for PR #${prNumber}: ${e.message}`);
      return;
    }

    const isAccepted = out.verdict === "accept";

    try {
      await octokit.issues.createComment({
        owner, repo, issue_number: prNumber,
        body:
          out.summary +
          `\n\n<details><summary>Disclosure</summary><p>This review was generated by zeon AI. Verdict: <strong>${out.verdict}</strong></p></details>`,
      });
    } catch (e) {
      log.error(`Failed to post AI comment on PR #${prNumber}: ${e.message}`);
    }

    if (isAccepted) {
      try {
        await octokit.pulls.createReview({
          owner, repo, pull_number: prNumber, event: "APPROVE",
          body: "Approved by zeon AI review.",
        });
        await octokit.pulls.merge({
          owner, repo, pull_number: prNumber, merge_method: "squash",
        });
      } catch (e) {
        log.error(`Failed to approve/merge PR #${prNumber}: ${e.message}`);
      }
    } else {
      try {
        await octokit.pulls.createReview({
          owner, repo, pull_number: prNumber, event: "REQUEST_CHANGES",
          body: out.summary,
        });
      } catch (e) {
        log.error(`Failed to request changes on PR #${prNumber}: ${e.message}`);
      }
    }
  }

  // Trigger AI review when a check suite completes successfully.
  app.on(["check_suite.completed"], async (ctx) => {
    const { repository, check_suite } = ctx.payload;
    if (repository.full_name !== "NeonGamerBot-QK/myBot") return;
    if (check_suite.conclusion !== "success") return;

    const prs = check_suite.pull_requests;
    if (!prs || prs.length === 0) return;

    for (const pr of prs) {
      let fullPr;
      try {
        ({ data: fullPr } = await ctx.octokit.pulls.get({
          owner: repository.owner.login,
          repo: repository.name,
          pull_number: pr.number,
        }));
      } catch (e) {
        app.log.error(`Failed to fetch PR #${pr.number}: ${e.message}`);
        continue;
      }
      await reviewAndMaybeMergePR(ctx.octokit, app.log, repository, fullPr);
    }
  });

  // Also trigger when zeon/merge-gate flips to success. This is the event
  // fired when Copilot threads are resolved — there's no check_suite event
  // for that transition, so without this handler the PR would never get picked up.
  app.on(["status"], async (ctx) => {
    const { repository, state, context: statusContext, sha } = ctx.payload;
    if (repository.full_name !== "NeonGamerBot-QK/myBot") return;
    if (statusContext !== "zeon/merge-gate" || state !== "success") return;

    let prs;
    try {
      ({ data: prs } = await ctx.octokit.repos.listPullRequestsAssociatedWithCommit({
        owner: repository.owner.login,
        repo: repository.name,
        commit_sha: sha,
      }));
    } catch (e) {
      app.log.error(`Failed to find PRs for SHA ${sha}: ${e.message}`);
      return;
    }

    for (const pr of prs.filter((p) => p.state === "open" && !p.draft)) {
      let fullPr;
      try {
        ({ data: fullPr } = await ctx.octokit.pulls.get({
          owner: repository.owner.login,
          repo: repository.name,
          pull_number: pr.number,
        }));
      } catch (e) {
        app.log.error(`Failed to fetch PR #${pr.number}: ${e.message}`);
        continue;
      }
      await reviewAndMaybeMergePR(ctx.octokit, app.log, repository, fullPr);
    }
  });

  // Label colors and descriptions for conventional commit types.
  const CONVENTIONAL_TYPE_LABELS = {
    feat: { color: "0075ca", description: "New feature" },
    fix: { color: "d73a4a", description: "Bug fix" },
    chore: { color: "e4e669", description: "Chore / maintenance" },
    docs: { color: "0075ca", description: "Documentation" },
    style: { color: "cfd3d7", description: "Code style change" },
    refactor: { color: "a2eeef", description: "Code refactor" },
    test: { color: "0e8a16", description: "Tests" },
    perf: { color: "e99695", description: "Performance improvement" },
    ci: { color: "f9d0c4", description: "CI/CD" },
    build: { color: "fef2c0", description: "Build system" },
    revert: { color: "b60205", description: "Revert" },
  };

  /**
   * Ensures a label exists in the repo, creating it if missing.
   *
   * @param {import('@octokit/rest').Octokit} octokit
   * @param {string} owner
   * @param {string} repo
   * @param {string} name
   * @param {string} color - hex without #
   * @param {string} description
   */
  async function ensureLabel (octokit, owner, repo, name, color, description) {
    try {
      await octokit.issues.getLabel({ owner, repo, name });
    } catch (e) {
      if (e.status === 404) {
        try {
          await octokit.issues.createLabel({ owner, repo, name, color, description });
        } catch (createErr) {
          // Another concurrent request may have created it between get and create — safe to ignore.
          if (createErr.status !== 422) throw createErr;
        }
      }
    }
  }

  /**
   * Parses the conventional commit type/scope from the PR title, uses AI to
   * suggest area labels, and applies all of them to the PR.
   *
   * @param {import('@octokit/rest').Octokit} octokit
   * @param {object} log
   * @param {object} repository
   * @param {object} fullPr
   */
  async function applyPRLabels (octokit, log, repository, fullPr) {
    const owner = repository.owner.login;
    const repo = repository.name;
    const labelsToAdd = [];

    // Parse conventional commit: type(scope)!: description
    const ccMatch = fullPr.title.match(/^(\w+)(\(([^)]+)\))?(!)?\s*:/);
    if (ccMatch) {
      const type = ccMatch[1].toLowerCase();
      const scope = ccMatch[3];
      const isBreaking = !!ccMatch[4];

      if (CONVENTIONAL_TYPE_LABELS[type]) {
        const { color, description } = CONVENTIONAL_TYPE_LABELS[type];
        await ensureLabel(octokit, owner, repo, type, color, description);
        labelsToAdd.push(type);
      }

      if (scope) {
        await ensureLabel(octokit, owner, repo, scope, "ededed", `Scope: ${scope}`);
        labelsToAdd.push(scope);
      }

      if (isBreaking || (fullPr.body || "").includes("BREAKING CHANGE")) {
        await ensureLabel(octokit, owner, repo, "breaking change", "b60205", "Breaking change");
        labelsToAdd.push("breaking change");
      }
    }

    // Ask AI for additional area/topic labels.
    try {
      const completion = await ai_client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content:
              `PR title: "${fullPr.title}"\nPR body: "${(fullPr.body || "").slice(0, 500)}"\n\n` +
              "Suggest 1-3 short, lowercase GitHub labels for this PR that describe the area of the codebase affected (e.g. \"auth\", \"api\", \"ui\", \"database\", \"config\") or the nature of the change. " +
              "Do NOT repeat the conventional commit type. Respond ONLY with a JSON array of strings. No explanation.",
          },
        ],
      });
      const raw = completion.choices[0].message.content.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      const aiLabels = JSON.parse(raw);
      for (const label of aiLabels.slice(0, 3)) {
        const name = String(label).toLowerCase().trim().slice(0, 50);
        if (name && !labelsToAdd.includes(name)) {
          await ensureLabel(octokit, owner, repo, name, "ededed", "");
          labelsToAdd.push(name);
        }
      }
    } catch (e) {
      log.error(`AI label suggestion failed for PR #${fullPr.number}: ${e.message}`);
    }

    if (labelsToAdd.length > 0) {
      try {
        await octokit.issues.addLabels({
          owner, repo, issue_number: fullPr.number, labels: labelsToAdd,
        });
      } catch (e) {
        log.error(`Failed to apply labels to PR #${fullPr.number}: ${e.message}`);
      }
    }
  }

  // Apply labels when a PR is opened or its title/head changes.
  app.on(["pull_request.opened", "pull_request.synchronize"], async (ctx) => {
    const { repository, pull_request } = ctx.payload;
    if (repository.full_name !== "NeonGamerBot-QK/myBot") return;
    await applyPRLabels(ctx.octokit, app.log, repository, pull_request);
  });

  // !zeon_review comment command — runs gate checks and reports status,
  // then kicks off AI review if everything is green.
  app.on(["issue_comment.created"], async (ctx) => {
    const { repository, issue, comment } = ctx.payload;
    if (repository.full_name !== "NeonGamerBot-QK/myBot") return;
    if (!issue.pull_request) return;
    if (comment.body.trim() !== "!zeon_review") return;

    const owner = repository.owner.login;
    const repo = repository.name;

    let fullPr;
    try {
      ({ data: fullPr } = await ctx.octokit.pulls.get({
        owner, repo, pull_number: issue.number,
      }));
    } catch (e) {
      app.log.error(`!zeon_review: failed to fetch PR #${issue.number}: ${e.message}`);
      return;
    }

    const blocking = [];

    // Check CI checks.
    try {
      const { data: checkRunsData } = await ctx.octokit.checks.listForRef({
        owner, repo, ref: fullPr.head.sha, per_page: 100,
      });
      const failing = checkRunsData.check_runs.filter(
        (run) =>
          run.name !== "zeon/merge-gate" &&
          (run.status !== "completed" ||
            !["success", "neutral", "skipped"].includes(run.conclusion)),
      );
      if (failing.length > 0) {
        blocking.push(`${failing.length} failing/pending CI check(s): ${failing.map((r) => r.name).join(", ")}`);
      }
    } catch (e) {
      app.log.error(`!zeon_review: CI check failed for PR #${issue.number}: ${e.message}`);
    }


    if (blocking.length > 0) {
      await ctx.octokit.issues.createComment({
        owner, repo, issue_number: issue.number,
        body:
          "⏳ **Zeon can't review yet.** The following need to be resolved first:\n\n" +
          blocking.map((r) => `- ${r}`).join("\n"),
      });
      return;
    }

    await ctx.octokit.issues.createComment({
      owner, repo, issue_number: issue.number,
      body: "🚀 CI is green — starting AI review now.",
    });

    // Clear the in-memory dedup key so a manual !zeon_review always gets a fresh review.
    reviewedPRSHAs.delete(`${repository.full_name}#${issue.number}@${fullPr.head.sha}`);
    await reviewAndMaybeMergePR(ctx.octokit, app.log, repository, fullPr);
  });

  // all copied probot bots
  // require("./Stale")(app)
  // try {require('./Linter')(app) } catch(e) {}
  // require('./MistakenPR')(app)
  const filePaths = [
    "./DupIssue",
    "./Linter",
    "./zeon_canvas",
    "./AiCodeReview/index.js",
    "./DCO",
    "./ReleasePlease",
    // "./SimilarCode",
    // './autoApproval/index',
    "./run_automations_for_vencord_css.js",
    // './weekly-digest/index'
  ];
  filePaths.forEach((e) => {
    try {
      require(e)(app);
      app.log(`Loaded module ${e}`);
    } catch (ee) {
      app.log(`Failed to load ${e}\n${ee.message}`);
    }
  });
  //  reqhjre
  // require('./DupIssue')(app)
  // require('./zeon_canvas')(app)
  // require('./SimilarCode')(app)
  // require('./autoApproval/index')(app)
  // // hard boy
  // require('./weekly-digest/index')(app)
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
// todo add https://github.com/wip/app/tree/master/ https://github.com/behaviorbot/request-info/tree/master
