require("dotenv").config()
const ServerConfig = {
  WebPanel: {
    host: process.env.WEB_HOST,
    port: process.env.WEB_PORT,
    // password: process.env.WEB_PORT,
    command: (env, script, args) => `cd ~/pr_scripts && ${env} node ${script} ${args.join(" ")}`
  }
}
const execCmd = require("./exec_command")
const commandLine = ServerConfig.WebPanel.command("PUBLIC_URL=/cat/pr/2", "create_react", [`'${JSON.stringify({ branchName: "tset", prNumber: 2, repo: "https://github.com/NeonGamerBot-QK/cat", outDir: "/home/saahild.com/public_html/cat" })}'`])

execCmd({
  user: process.env.SSH_USER,
  password: process.env.PASSWORD,
  host: S1erverConfig.WebPanel.host,
  port: ServerConfig.WebPanel.port
}, commandLine, { info: console.log }).then((e) => {
  console.log("done")
})


