/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = app => {
  app.on('push', async ctx => {
        // ctx.payload
    const context = ctx
    console.log(ctx.payload.repository.html_url.toLowerCase())
    if (ctx.isBot) return
    console.log(1)
    if (!ctx.payload.repository.html_url.toLowerCase().includes('vencord-themes')) return
    const branch = ctx.payload.ref.replace('refs/heads/', '')
    console.log('my repo pull  - vencord')
        // files
    let { files } = await ctx.octokit.repos.compareCommits(ctx.repo({
      base: ctx.payload.before,
      head: ctx.payload.after
    })).then(d => d.data)

    const allTheFiles = await ctx.octokit.repos.compareCommits(ctx.repo({
      base: '77dae95e7383a7bdc064cd206f3aee995ecb89f6',
      head: ctx.payload.after
    })).then(e => e.data.files.filter(e => e.filename.endsWith('.theme.css')))
        // welcome back to the most s tupid way to code
    const createdOnes = allTheFiles.filter(e => e.status == 'added')
    const modifiedOnes = allTheFiles.filter(e => e.status == 'modified')
    const deletedOnes = allTheFiles.filter(e => e.status == 'deleted')
    const allContent = await ctx.octokit.repos.getContent(ctx.repo({
      path: 'All.theme.css',
      ref: branch
    }))
    let Allstr = `${Buffer.from(allContent.data.content, 'base64')}\n`
    for (const one of createdOnes) {
      console.log(one)
      if (one.filename.includes('All')) continue
      Allstr += `@import url("${one.raw_url}")\n`
    }
    for (const one of modifiedOnes) {
      const f = one
      if (f.previous_filename && f.filename) {
        Allstr = Allstr.replace(f.previous_filename, f.filename)
      } else {
        console.log('no rename so not my problem')
      }
    }
    for (const one of deletedOnes) {
      let splits = Allstr.split('\n')
      splits = splits.filter(e => !e.includes(one.raw_url))
      Allstr = splits.join('\n')
    }
    console.log(Allstr)

    ctx.octokit.repos.createOrUpdateFileContents(ctx.repo({
      path: 'All.theme.css',
      message: `[ALL] Update them`,
      content: Buffer.from(Allstr).toString('base64'),
      sha: allContent.data.sha,
      branch
    }))
        // createdOnes.forEach
        // const dirsInRoot = await ctx.octokit.repos

        // TESTING ONLY DO NOT OVERRIDE IN PROD
    files = []
    files.forEach(async (f) => {
      if (f.status == 'removed') return
        //   if
      switch (f.status) {
                // case 'copied':
        case 'renamed':
                    //   const content =   await ctx.octokit.repos.getContent(ctx.repo({
                    //     path: 'All.theme.css',
                    //     ref: branch
                    //   }))
                    // ctx.octokit.repos.createOrUpdateFileContents(ctx.repo({
                    //     path: 'All.theme.css',
                    //     message: `[ALL] Re-name ${f.previous_filename} -> ${f.filename}`,
                    //     content: Buffer.from(c.output.replaceAll(`${f.previous_filename}`, f.filename)).toString('base64'),
                    //     sha: content.data.sha,
                    //     branch
                    //   }))
                    // ctx.octokit.repos.listFi

          ctx.octokit.repos.createOrUpdateFileContents(ctx.repo({
            path: 'All.theme.css',
            message: `[ALL] Re-name ${f.previous_filename} -> ${f.filename}`,
            content: Buffer.from(Buffer.from(content2.data.content, 'base64').replace(encodeURI(f.previous_filename), f.filename)),
            sha: content.data.sha,
            branch
          }))
          ctx.octokit.repos.createCommitComment({
            commit_sha: ctx.payload.after,
            repo: ctx.payload.repository.name,
            body: `Renamed \`${f.previous_filename}\` to  [${f.filename}](${f.blob_url}) to All.css`,
            owner: ctx.payload.repository.owner.name
          })
          break
        case 'added':
          await ctx.octokit.repos.createCommitComment({
            commit_sha: ctx.payload.after,
            repo: ctx.payload.repository.name,
            body: `Added [${f.filename}](${f.blob_url}) to All.css`,
            owner: ctx.payload.repository.owner.name
          })
          const content = await ctx.octokit.repos.getContent(ctx.repo({
            path: 'All.theme.css',
            ref: branch
          }))
          ctx.octokit.repos.createOrUpdateFileContents(ctx.repo({
            path: 'All.theme.css',
            message: `[ALL] Add ${f.filename}`,
            content: Buffer.from(Buffer.from(content.data.content, 'base64') + `\n@import url("${f.raw_url}");`).toString('base64'),
            sha: content.data.sha,
            branch
          }))
          break
        default:
          console.log(f, 'DEFAULT ON RUN')
      }
    })
  })
}
