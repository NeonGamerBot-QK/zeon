// Deployments API example
// See: https://developer.github.com/v3/repos/deployments/ to learn more
const ServerConfig = {
  WebPanel: {
    host: process.env.WEB_HOST,
    port: process.env.WEB_PORT,
    // password: process.env.WEB_PORT,
    command: (env, script, args) => `cd ~/pr_scripts && ${env} node ${script} ${args.join(' ')}`
  }
}
const execCmd = require('./exec_command')
const allowed_repos = [
  'https://github.com/NeonGamerBot-QK/test-d',
  'https://github.com/NeonGamerBot-QK/cat'
]
const deploy_repos = [
  {
    url:
  'https://github.com/NeonGamerBot-QK/cat',
    env: 'PUBLIC_URL=/cat/pr/',
    templateUrl: 'https://saahild.com/cat/pr/{pr}',
    type: 'create_react',
    server: ServerConfig.WebPanel,
    outDir: '/home/saahild.com/public_html/cat'
  }
]
const fs = require('fs')
const { execSync, exec } = require('child_process')
const path = require('path')
const fetch = require('node-fetch')
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = app => {
  // Your code here
  if (process.env.UPTIME_URL) {
    app.log('LOADED UPTIME')
    setInterval(() => {
      fetch(process.env.UPTIME_URL).then(() => {
        app.log('declared UPTIME')
      })
    }, 50 * 1000)
  }
  app.log.info('Yay, the app was loaded!')
  app.on(['issues.opened'], async ctx => {
    app.log.info('new issue')
    app.log.info(ctx)
    //  const params = ctx.issue({body: 'Hello World!'})
    //   return ctx.github.issues.createComment(params)
    // return ctx.octokit.issues.createComment(
    //   ctx.issue({ body: "Hello World!" })
    // );
  })
  // app.on('')
  // todo intervaled pkg check for major and minor NO PATCH
// setInterval(async () => {
//   const octokit = await app.auth()
//   // octokit.issues.c 
//   const reposToCheck = octokit.repos()

// },  2*60*60 * 1_000)
  // app.auth().then(e => )
    app.on(['pull_request.opened', 'pull_request.edited'], async (ctx) => {
      const {parser } = require('@conventional-commits/parser')
      try {
     const data =    parser(ctx.payload.pull_request.title)
const type = data.children[0].children.find(e => e.type == 'type').value
const scope = data.children[0].children.find(e => e.type == 'scope')
      // if(ctx.octokit.ge )
      // const template = ctx.config('zeon/')
      try {
const template = await ctx.octokit.rest.repos.getContent({
  owner: ctx.payload.repository.owner.login,
  repo: ctx.payload.repository.name,
  path: `.github/zeon/${type}-message.md`
})
let templ = Buffer.from(template.data.content, 'base64').toString()
const Ctx = {
  pr_title: ctx.payload.pull_request.title,
  pr_scope: scope ? scope.value : "",
  issue_number: ctx.payload.pull_request.number,
  repo_owner: ctx.payload.repository.owner.login,
  repo_name: ctx.payload.repository.name,
  stamp: Date.now(),
  stamp_str: new Date().toString()
}
let content = templ
Object.entries(Ctx).forEach(([key,value]) => {
content = content.replaceAll(`{{${key}}}`, value)
})
setTimeout(() => {
   ctx.octokit.issues.createComment({
    repo: ctx.payload.repository.name,
    issue_number: ctx.payload.pull_request.number,
    // : ctx.payload.pull_request.number,
    owner: ctx.payload.repository.owner.login,
  body: content
  })
}, 450)

      } catch (e) {
console.error(e)
      }

      } catch (e) {
console.error(e)
        // report error
setTimeout(async () => {
try {
  // console.clear()
  console.error(e, ctx.payload.pull_request.number)
  console.error(`Wow it broke`)
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
    
    
  })
} catch (e) {}
}, 250)
      }
    })
  app.on(['issues.closed'], async ctx => {
    app.log.info('closed issue')
    return ctx.octokit.issues.createComment(
      ctx.issue({ body: '## Thank you for your issue!' })
    )
  })
  app.on(['pull_request.opened'], async ctx => {
    if(ctx.payload.repository.name == ctx.payload.repository.owner.login) {
await ctx.octokit.issues.createComment({
  owner: ctx.payload.repository.owner.login, 
  repo: ctx.payload.repository.name,
  issue_number: ctx.payload.number,
  body: `## Please do not Make PR's\nPR's have been disabled in this repo if you want to contribute contact @NeonGamerBot-QK Directly via email.\nThanks.\n![No PR](https://raw.githubusercontent.com/NeonGamerBot-QK/NeonGamerBot-QK/main/no-pr.jpg)`,
})
      await ctx.octokit.issues.update({
        owner: ctx.payload.repository.owner.login, 
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.number,
        state: 'closed'
      })
      await ctx.octokit.issues.lock({
        owner: ctx.payload.repository.owner.login, 
        repo: ctx.payload.repository.name,
        issue_number: ctx.payload.number,
        lock_reason: "off-topic",
      })
    }
  })
  app.on('pull_request.closed', ctx => {
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
  })
  app.onError((e) => {
    app.log.error(e.message)
    if (e.stack) {
      fs.writeFileSync('error.txt', e.stack)
    }
  })
  app.on(['pull_request.opened', 'pull_request.synchronize'], async context => {
    // Creates a deployment on a pull request event
    // Then sets the deployment status to success
    // NOTE: this example doesn't actually integrate with a cloud
    // provider to deploy your app, it just demos the basic API usage.
    // app.log.info(context.payload.repository.html_url)

    if (!allowed_repos.includes(context.payload.repository.html_url)) {
      app.log.info('not running on ' + context.payload.repository.html_url)
      return
    }
    if (deploy_repos.some(e => e.url === context.payload.repository.html_url)) {
      const repoConfig = deploy_repos.find(e => e.url === context.payload.repository.html_url)
      const branchName = context.payload.pull_request.head.ref // HOW AM I SUPPOSED TO GET THE BRANCh!
      const prNumber = context.payload.pull_request.number
      const repo = context.payload.repository.html_url
// const outDir = "out"
      app.log.info('Running CMD')
      const commandLine = repoConfig.server.command(repoConfig.env + prNumber || '', repoConfig.type, [`'${JSON.stringify({ branchName, prNumber, repo, outDir: repoConfig.outDir })}'`])
      app.log.info('Command line: ' + commandLine)
      execCmd({
        user: process.env.SSH_USER,
        password: process.env.PASSWORD,
        host: ServerConfig.WebPanel.host,
        port: ServerConfig.WebPanel.port
      }, commandLine, app.log).then((e) => {
        const params = context.issue({ body: `## Thanks for making a PR\n You can see a live version of this PR [here](${repoConfig.templateUrl.replace('{pr}', prNumber)})` })

          // Post a comment on the issue
        return context.octokit.issues.createComment(params).then((e) => app.log.info('DONE DONE!'))
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
  })
// on repo create event
  app.on(['repository.created'], (ctx) => {
  // ctx.isBot
  // ctx.octokit.actions.createOrUpdateRepoSecret({ owner: ctx.payload.repository.owner, encrypted_value: "", secret_name: "CP_HOST"})
  })
  app.on(['push'], async ctx => {
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
    compare.data.files.forEach(file => {
      console.log(file)
      if (file.filename.includes('.DS_STORE')) {
        const content = await context.octokit.repos.getContent(
          ctx.repo({
            path: file.filename,
            ref: branch,
          }),
        );
        ctx.octokit.repos.deleteFile(ctx.repo({
          sha: content.data.sha,
          path: file.filename,
          branch,
          message: "chore(cleanup): Delete .DS_STORE files"
        }))
      }
    })
  })
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

app.on('push', (ctx) => {
  if(ctx.payload.repository.name !== 'zeon') {
    app.log(`Not my repo to pull from`)
    return
  }

  if(ctx.isBot) {
    app.log(`Not writing comments for bot`)
    return;
  }
  exec(`git pull`, (err, stdout, stderr) => {
    // app.log(stdout, stderr)
    if (err) return app.log(err)
    // if(stderr.length > 10) {
    //   app.log(stderr)
    //   return;
    // }
    // console.log(ctx.payload)
    ctx.octokit.repos.createCommitComment({
      commit_sha: ctx.payload.after,
      repo: ctx.payload.repository.name,
      body: `\`\`\`diff\n${stdout}\`\`\``,
      owner: ctx.payload.repository.owner.name,
    }).then(() => {
      app.log('App Shuttding down (5s)')

      setTimeout(() => {
        app.log('App Shuttding down (EXIT)')
        process.exit(0)
      }, 5_000)
    })
  })
})
// all copied probot bots
// require("./Stale")(app)
  // try {require('./Linter')(app) } catch(e) {}
// require('./MistakenPR')(app)
const filePaths = [
  './DupIssue', './Linter','./zeon_canvas','./SimilarCode',
  // './autoApproval/index',
   './run_automations_for_vencord_css.js',
// './weekly-digest/index'
]
filePaths.forEach((e) => {
  try {
    require(e)(app)
    app.log(`Loaded module ${e}`)
  } catch (ee) {
    app.log(`Failed to load ${e}\n${ee.message}`)
  }
})
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
}
