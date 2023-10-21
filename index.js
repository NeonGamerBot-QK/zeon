// Deployments API example
// See: https://developer.github.com/v3/repos/deployments/ to learn more
const ServerConfig = {
  WebPanel: {
    host: process.env.WEB_HOST,
    port: process.env.WEB_PORT,
    // password: process.env.WEB_PORT,
    command: (env, script, args) => `cd ~/pr_scripts && ${env} node ${script} ${args.join(" ")}`
  }
}
const execCmd = require("./exec_command")
const allowed_repos = [
  "https://github.com/NeonGamerBot-QK/test-d",
  "https://github.com/NeonGamerBot-QK/cat",
]
const deploy_repos = [ 
  { 
    url: 
  "https://github.com/NeonGamerBot-QK/cat",
  env: "PUBLIC_URL=/cat/pr/",
  templateUrl: "https://saahild.com/cat/pr/{pr}",
type: "create_react",
server: ServerConfig.WebPanel,
outDir: "/home/saahild.com/public_html/cat"
  }
]
const fs = require("fs")
const { execSync } = require("child_process")
const path = require("path")
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = app => {
  // Your code here

  app.log.info("Yay, the app was loaded!");
  app.on(["issues.opened"], async ctx => {
    app.log.info("new issue");
    app.log.info(ctx);
    //  const params = ctx.issue({body: 'Hello World!'})
    //   return ctx.github.issues.createComment(params)
    // return ctx.octokit.issues.createComment(
    //   ctx.issue({ body: "Hello World!" })
    // );
  });

  app.on(["issues.closed"], async ctx => {
    app.log.info("closed issue");
    return ctx.octokit.issues.createComment(
      ctx.issue({ body: "## Thank you for your issue!" })
    );
  });
  app.on("pull_request.closed", ctx => {
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
  app.log.error(e.message)
  if(e.stack) {
    fs.writeFileSync("error.txt", e.stack)
  }
})
  app.on(["pull_request.opened", "pull_request.synchronize"], async context => {
    // Creates a deployment on a pull request event
    // Then sets the deployment status to success
    // NOTE: this example doesn't actually integrate with a cloud
    // provider to deploy your app, it just demos the basic API usage.
    app.log.info(context.payload.repository.html_url);

   
if(!allowed_repos.includes(context.payload.repository.html_url)) {
  app.log.info("not running on " + context.payload.repository.html_url)
  return;
}
if(deploy_repos.some(e => e.url === context.payload.repository.html_url)) {
 const repoConfig = deploy_repos.find(e => e.url === context.payload.repository.html_url)
  const branchName = context.payload.pull_request.head.ref // HOW AM I SUPPOSED TO GET THE BRANCh!
const prNumber = context.payload.pull_request.number
const repo = context.payload.repository.html_url
// const outDir = "out"
app.log.info("Running CMD")
const commandLine = repoConfig.server.command(repoConfig.env+prNumber || "", repoConfig.type, [`'${JSON.stringify({ branchName, prNumber, repo, outDir: repoConfig.outDir })}'`])
app.log.info("Command line: " + commandLine)
execCmd({
  user: process.env.SSH_USER,
  password: process.env.PASSWORD,
  host: ServerConfig.WebPanel.host,
  port: ServerConfig.WebPanel.port
}, commandLine, app.log).then((e) => {
  const params = context.issue({ body: `## Thanks for making a PR\n You can see a live version of this PR [here](${repoConfig.templateUrl.replace("{pr}", prNumber)})` });

          // Post a comment on the issue
          return context.octokit.issues.createComment(params).then((e) => app.log.info("DONE DONE!"));
})
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
  });
// on repo create event
app.on(['repository.created'], (ctx) => {
  // ctx.isBot
  // ctx.octokit.actions.createOrUpdateRepoSecret({ owner: ctx.payload.repository.owner, encrypted_value: "", secret_name: "CP_HOST"})
})
app.on(['push'], async (ctx) => {
  // ctx.octokit.issues.create(ctx.issue({
  //   body: 'test',
  // }))
  const push = context.payload

  // robot.log.info(context, context.github)
  
      const compare = await context.octokit.repos.compareCommits(ctx.repo({
        base: push.before,
        head: push.after
      }))
      const branch = push.ref.replace('refs/heads/', '')
      return Promise.all(compare.data.files.map(async file => {
        if (!exclude.includes(file.filename)) {
          const content = await ctx.octokit.repos.getContent(ctx.repo({
            path: file.filename,
            ref: branch
          }))
          const text = Buffer.from(content.data.content, 'base64').toString()
          Object.assign(linterItems, {cwd: '', fix: true, filename: file.filename})
  
         
            if (err) {
              throw new Error(err)
            }
            return Promise.all(results.results.map(result => {
              if (result.output) {
                // Checks that we have a fixed version and the file isn't part of the exclude list
              //   context.octokit.repos.createOrUpdateFileContents()
                ctx.octokit.repos.createOrUpdateFileContents(ctx.repo({
                  path: file.filename,
                  message: `Fix lint errors for ${file.filename}`,
                  content: Buffer.from(result.output).toString('base64'),
                  sha: content.data.sha,
                  branch
                }))
              }
            }))
         
        }
      }))
})

// all copied probot bots
// require("./Stale")(app)
require('./Linter')(app)
// require('./MistakenPR')(app)
require("./DupIssue")(app)
require('./zeon_canvas')(app)
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
