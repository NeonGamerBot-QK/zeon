// major.miner.patch
// ignore patch
// if minor is > 2 then yes
// PR for sure if MAJOR
// ISSUE for minor
// nodejs api list https://nodejs.org/dist/index.json
const fetch = require('node-fetch')
const formatVersion = (v) => {
    return v.split('')
    .filter(e => {
        if(e === '.') return true;
        return !isNaN(e)
    })
    .join('')
    .split('.').slice(0,3)
}
module.exports = (app, pkgJSON) => {
    const arr = []
    if(pkgJSON['dependencies']) {
        Object.entries(pkgJSON['dependencies']).forEach(async ([key,value]) => {
        const onlineVersion = await fetch('https://registry.npmjs.com/'+key).then(r => r.json())
      let l =   onlineVersion['dist-tags'].latest
let latestVersion = onlineVersion.versions[l]
const [myMajor,myMinor,myPatch] = formatVersion(value)
const [onlineMajor,onlineMinor,onlinePatch] = formatVersion(l)
let update = null
if(myMinor < onlineMinor) update = 'min-issue'
if(myMajor < onlineMajor) update = 'm-pr'
if(!update) return;
switch(update) {
    case 'm-pr':
    break;
    case 'min-issue':
        app.context.octokit.issues.create(app.issue({
            body: `## Dependency update
           \`\`\`diff
           
           \`\`\`
            `,
            title: `Dependency Update ${key} ${value} -> ${l}`
        }))  
    break;
}

         })

    }

}