const ignore = require("ignore");
const path = require("path");
const fs = require("fs");
const { createCanvas } = require("canvas");
const fetch = require("node-fetch");
const FormData = require("form-data");
// const attachments = require('probot-attachments');
const createCanva = (func) => {
  return new Promise(async (res) => {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext("2d");
    await func(ctx);
    canvas.toBuffer(async (e, b) => {
      const form = new FormData();
      console.log(form.getHeaders());
      form.append("file", b, {
        filename: "output.png",
        value: "output.png",
        contentType: "image/png",
      });

      const files = await fetch(process.env.CDN_URL, {
        headers: {
          Authorization: process.env.CDN_KEY,
          format: "uuid",
          "image-compression-percent": 3,
          "Expires-At": "365d",

          // 'content-type': 'multipart/form-data; --'+form.getBoundary()
          ...form.getHeaders(),
        },
        body: form,
        method: "POST",
      }).then((r) => r.json());
      console.log(files);
      res(files.files[0]);
    });
  });
};

module.exports = async (app) => {
  app.on(["pull_request.opened", "pull_request.synchronize"], async (ctx) => {
    console.log(`#zeoncanvas`);
    const context = ctx;
    if (ctx.payload.repository.html_url.includes("zeoncanvas")) {
      const config = {
        broken: ["*.pem", "*-lock.json", "node_modules", ".env", "*.log"],
        config: [".github", ".travis*"],
        canvas: ["src/blocks/*.js"],
        util: ["src/util/*.js"],
        docs: ["*.md"],
      };
      const files = await ctx.octokit.pulls.listFiles(ctx.pullRequest());
      const changedFiles = files.data.map((file) => file.filename);
      const labels = new Set();
      for (const label in config) {
        app.log("looking for changes", label, config[label]);
        const matcher = ignore().add(config[label]);

        if (changedFiles.find((file) => matcher.ignores(file))) {
          labels.add(label);
        }
      }
      const labelsToAdd = Array.from(labels);

      app.log("Adding labels", labelsToAdd);
      if (labelsToAdd.length > 0) {
        context.octokit.issues.addLabels(
          ctx.issue({
            labels: labelsToAdd,
          }),
        );
      }

      app.log("done i think");
      app.log(labelsToAdd);
      let body = ``;
      let footnotes = ``;
      if (labelsToAdd.length == 1 && labelsToAdd[0] == "canvas") {
        let isUI = false;
        const previews = [];
        for (const file of files.data) {
          let fdata = await fetch(file.raw_url).then((r) => r.text());

          // .then(t => t.split('\n'))
          if (fdata.split("\n")[0] === "//WEBEDITOROVERRIDE") {
            isUI = true;
          }
          let func;
          // console.log(fdata, 'STUPID APP')
          try {
            func = eval(fdata);
          } catch (e) {
            previews.push({ error: e.message, name: file.filename });
            continue;
          }
          let output = await createCanva(func);
          previews.push({ name: file.filename, img: output });
        }
        app.log(previews);
        body += `
## Main Info
Thanks for your PR to the canvas system. the following files will be added:
${changedFiles.map((f) => `- \`${f}\``).join("\n")}
## Tests
there should be tests running from me or from the github workflow system. 
if these tests do not pass please fix ur errored code  to have it approved.
here are some of the things that are on the workflow tests:
- should have valid syntax
- exports something
- exports a function
- takes a param
- the filename is an int from 0-99
- the file is a javascript file
- returns something when in test mode
## Linter
Your code will be linted by the bot in this PR.
## Previews
${previews
  .map((p) => {
    return `- \`${p.name}\`:\n 
  ${
    p.error
      ? `\`\`\`js\n${p.error}\n\`\`\``
      : `
  ![${p.name} rendered output](${p.img})
  `
  }
  `;
  })
  .join("\n")}
`;

        footnotes += `**this pr is affecting only on the canvas part**\n${isUI ? `\n*this file is edited on the web UI*` : ""}`;
      }
      ctx.octokit.issues.createComment(
        ctx.issue({
          body: `# Thank you\n 
  ${body}
  \n# Footnotes\n
  ${footnotes}
   `,
        }),
      );

      // now find a way to run the tests
      app.log(
        "this is the part where the test are supposed to run BUT idk how :)",
      );
      // app.log(ctx.payload)
      for (const file of files.data) {
        let fdata = await fetch(file.raw_url).then((r) => r.text());
        const fileName = path.join(__dirname, "temp_", file.filename);
        fs.writeFileSync(fileName, fdata);
        try {
          const chunks = [];
          const stream = require("child_process")
            .exec(
              "npx --yes jest --verbose zeon_canvas_file.test.js " +
                path.basename(file.filename),
            )
            .stderr.on("data", (d) => {
              app.log(d);
              chunks.push(d);
            });

          stream.on("close", async (e) => {
            app.log("\t" + chunks.join("").split("\n").join("\n\t"));
            ctx.octokit.issues.createComment(
              ctx.issue({
                body: `# ${chunks.some((e) => e.includes("FAIL")) ? "❌" : "✅"} Test results \`${file.filename}\`:\n \`\`\`console\n${chunks.join("")}\n\`\`\`
       `,
              }),
            );
            if (!chunks.some((e) => e.includes("FAIL"))) {
              // cant use await? idk whhy
              await ctx.octokit.rest.pulls.createReview({
                owner: ctx.payload.repository.owner.login,
                repo: ctx.payload.repository.name,
                pull_number: ctx.payload.pull_request.number,
                event: "APPROVE",
              });
            }
            fs.rmSync(fileName);
          });
        } catch (e) {
          ctx.octokit.issues.createComment(
            ctx.issue({
              body: `# ❌❌ Test results \`${file.filename}\`:\n 
            \`\`\`
            ${e.message}
            \`\`\`
             `,
            }),
          );
          fs.rmSync(fileName);
        }
      }
    }
  });

  app.on(["pull_request.closed"], async (ctx) => {
    const context = ctx;
    if (ctx.payload.repository.html_url.includes("zeoncanvas")) {
      const files = await ctx.octokit.pulls.listFiles(ctx.pullRequest());
      const changedFiles = files.data.map((file) => file.filename);
      const labels = ctx.payload.pull_request.labels.map((e) => e.name);
      const isMerged = ctx.payload.pull_request.merged;

      // console.log(labels)
      let body = ``;
      let footnotes = ``;
      if (labels.length == 1 && labels[0] == "canvas") {
        body += `


${
  isMerged
    ? `## Main Info\nThanks for your PR to the canvas system, You can visit your result [here](https://saahild.com/zeon/canvas). the following files are added:
${changedFiles.map((f) => `- \`${f}\``).join("\n")}`
    : `## Main Info
Thanks for your PR to the canvas system, sorry it was unable to be accepted
## Tests
your pr could have been rejected because it did not pass some of these tests, please check that it validates the checks below:
- should have valid syntax
- exports something
- exports a function
- takes a param
- the filename is an int from 0-99
- the file is a javascript file
- returns something when in test mode`
}
`;
        // footnotes += `**this pr is affecting only on the canvas part**\n${isUI ? `\n*this file is edited on the web UI*` : ""}`
      }
      ctx.octokit.issues.createComment(
        ctx.issue({
          body: `# Thank you\n 
  ${body}
  \n
  ${footnotes ? `# Footnotes\n${footnotes}` : ""}
   `,
        }),
      );
      if (isMerged) {
        // add user to codeowners for there block
        const files = await ctx.octokit.pulls.listFiles(ctx.pullRequest());
        const appendToCodeOwners = files.data
          .map((file) => file.filename)
          .map((f) => `${f} @${ctx.payload.pull_request.user.login}`)
          .join("\n");
        // line above is incase it fails because the file exists OR codeowners says no
        const currentFileContent = await ctx.octokit.repos
          .getContent(
            ctx.repo({
              path: ".github/CODEOWNERS",
              ref: "main",
            }),
          )
          .then((e) => {
            e.data.content = Buffer.from(e.data.content, "base64").toString();
            return e;
          });
        try {
          await ctx.octokit.repos.createOrUpdateFileContents(
            ctx.repo({
              path: ".github/CODEOWNERS",
              message: `ci(git): update codeowners`,
              sha: currentFileContent.data.sha,
              content: Buffer.from(
                [
                  ...new Set(
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
      }
    }
  });
};
