const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")
const prNumber = 1
const repo = "https://github.com/NeonGamerBot-QK/saahild.com"
let branchName = "test"
const outDir = "out"
const tempDirSync = fs.mkdtempSync("temp");
execSync("git clone " + repo, { cwd: tempDirSync })
execSync(`git fetch origin pull/${prNumber}/head:${branchName}`, { cwd: path.join(tempDirSync, "saahild.com") })
execSync(`git checkout ${branchName}`, { cwd: path.join(tempDirSync, "saahild.com") })
fs.writeFileSync(path.join(tempDirSync, "saahild.com", ".env"), "PUBLIC_URL=/pr/"+prNumber)
execSync(`yarn`, { cwd: path.join(tempDirSync, "saahild.com"), stdio: "inherit" })
execSync(`yarn build`, { cwd: path.join(tempDirSync, "saahild.com"), stdio: "inherit" })
fs.mkdirSync(outDir + "/pr/"+prNumber, { recursive: true })
fs.cpSync(path.join(tempDirSync, "saahild.com", "build"), path.join(outDir, "pr", prNumber.toString()), { recursive: true })
