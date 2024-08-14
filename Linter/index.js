const standard = require('standard')

const prettier= require('prettier')
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} robot
 */
module.exports = robot => {
  robot.on('push', async context => {
    if(context.payload.pusher.name.includes('zeon')) return; // ignore my commitss
    let exclude = []
    const linterItems = {
      plugins: [
        '@prettier/plugin-php',
        '@prettier/plugin-pug',
        '@prettier/plugin-ruby',
        '@prettier/plugin-xml',
        '@stedi/prettier-plugin-jsonata',
        'prettier-plugin-go-template',
        'prettier-plugin-java',
        'prettier-plugin-kotlin',
        'prettier-plugin-motoko',
        'prettier-plugin-nginx',
        'prettier-plugin-prisma',
        'prettier-plugin-properties',
        'prettier-plugin-rust',
        'prettier-plugin-sh',
        'prettier-plugin-sql',
        'prettier-plugin-sql-cst',
        'prettier-plugin-svelte',
        'prettier-plugin-toml'
      ]
    }
    const push = context.payload

// robot.log.info(context, context.github)

    const compare = await context.octokit.repos.compareCommits(context.repo({
      base: push.before,
      head: push.after
    }))

    const branch = push.ref.replace('refs/heads/', '')
    // Checks for a config file
    let config = context.config('prettier.yml')
    // Adds properties to a LinterItem object to be passed to standard.lintText()
    if (config) {
      for (const property in config) {
   linterItems[property] = config[property]
      }
    }

    return Promise.all(compare.data.files.map(async file => {
      if (!exclude.includes(file.filename)) {
        const content = await context.octokit.repos.getContent(context.repo({
          path: file.filename,
          ref: branch
        }))
        console.log(`Linting ${file.filename}`)
        const text = Buffer.from(content.data.content, 'base64').toString()
        // Object.assign(linterItems, {cwd: '', fix: true, filename: file.filename})
        linterItems['filepath'] = file.filename
      await prettier.format(text, linterItems).then((result) => {
            if (result) {
              // Checks that we have a fixed version and the file isn't part of the exclude list
            //   context.octokit.repos.createOrUpdateFileContents()
              context.octokit.repos.createOrUpdateFileContents(context.repo({
                path: file.filename,
                message: `enhancement(lint): Fix lint errors for ${file.filename}\n\nCo-authored-by: ${context.payload.pusher.name} <${context.payload.pusher.email}>`,
                content: Buffer.from(result).toString('base64'),
                sha: content.data.sha,
                branch
              }))
            }
        }).catch((e) => {
console.error(e)
          // context.octokit.repos.createCommitComment(context.repo({
          //   commit_sha:  context.payload.
          // }))
        })
      }
    }))
  })
}
