const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")
const prNumber = 1
const repo = "https://github.com/NeonGamerBot-QK/cat"
let branchName = "test"
const outDir = "out"
const tempDirSync = fs.mkdtempSync("temp");
execSync("git clone " + repo, { cwd: tempDirSync })
execSync(`git fetch origin pull/${prNumber}/head:${branchName}`, { cwd: path.join(tempDirSync, "cat") })
execSync(`git checkout ${branchName}`, { cwd: path.join(tempDirSync, "cat") })
fs.writeFileSync(path.join(tempDirSync, "cat", ".env"), "PUBLIC_URL=/pr/"+prNumber)
execSync(`yarn`, { cwd: path.join(tempDirSync, "cat"), stdio: "inherit" })
execSync(`yarn build`, { cwd: path.join(tempDirSync, "cat"), stdio: "inherit" })
fs.mkdirSync(outDir + "/pr/"+prNumber, { recursive: true })
fs.cpSync(path.join(tempDirSync, "cat", "build"), path.join(outDir, "pr", prNumber.toString()), { recursive: true })
