#!/usr/bin/env node
/**
 * amp-repo-automation.js
 *
 * A script that clones a repository, runs the Amp CLI to perform tasks,
 * then commits and pushes the changes back to the repository.
 *
 * Usage:
 *   node amp-repo-automation.js <repo-url> "<amp-prompt>" [branch]
 *
 * Example:
 *   node amp-repo-automation.js https://github.com/user/repo "Fix all ESLint errors" main
 *
 * Environment Variables:
 *   GITHUB_TOKEN - GitHub token for authentication (optional, for private repos)
 *   COMMIT_MESSAGE - Custom commit message (optional, defaults to "chore: automated changes via Amp CLI")
 *   AMP_API_KEY - Amp API key for authentication (required for non-interactive use)
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Configuration constants
const DEFAULT_BRANCH = "main";
const DEFAULT_COMMIT_MESSAGE = "chore: automated changes via Amp CLI";

/**
 * Executes a shell command synchronously and returns the output.
 * @param {string} command - The command to execute
 * @param {object} options - Options to pass to execSync
 * @returns {string} - The command output
 */
function runCommand(command, options = {}) {
  console.log(`\n🔹 Running: ${command}`);
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });
    if (output.trim()) {
      console.log(output.trim());
    }
    return output.trim();
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.stderr || error.message);
    throw error;
  }
}

/**
 * Runs the Amp CLI with a given prompt in the specified directory.
 * Uses `script` command to allocate a pseudo-TTY for proper interactive output.
 * Uses --dangerously-allow-all to auto-approve all tool uses.
 *
 * @param {string} workDir - The working directory
 * @param {string} prompt - The prompt to send to Amp
 * @returns {Promise<void>}
 */
function runAmpCli(workDir, prompt) {
  return new Promise((resolve, reject) => {
    console.log(`\n🤖 Running Amp CLI with prompt: "${prompt}"`);
    console.log(`📂 Working in: ${workDir}`);

    // Check for AMP_API_KEY
    if (!process.env.AMP_API_KEY) {
      console.warn(
        "⚠️  Warning: AMP_API_KEY not set. Amp may require authentication.",
      );
    }

    // Escape the prompt for shell use (escape single quotes)
    const escapedPrompt = prompt.replace(/'/g, "'\\''");

    // Use simple shell pipe approach: echo 'prompt' | amp --dangerously-allow-all --execute
    const command = `echo '${escapedPrompt}' | amp --dangerously-allow-all --execute`;

    console.log(`🔹 Running: ${command}\n`);

    const ampProcess = spawn("sh", ["-c", command], {
      cwd: workDir,
      stdio: "inherit",
    });

    ampProcess.on("close", (code) => {
      if (code === 0) {
        console.log("\n✅ Amp CLI completed successfully");
        resolve();
      } else {
        reject(new Error(`Amp CLI exited with code ${code}`));
      }
    });

    ampProcess.on("error", (error) => {
      reject(new Error(`Failed to start Amp CLI: ${error.message}`));
    });
  });
}

/**
 * Main function that orchestrates the clone, amp run, commit, and push workflow.
 * @param {string} repoUrl - The repository URL to clone
 * @param {string} ampPrompt - The prompt to send to Amp CLI
 * @param {string} branch - The branch to work on
 */
async function main(repoUrl, ampPrompt, branch = DEFAULT_BRANCH) {
  // Validate inputs
  if (!repoUrl) {
    console.error("❌ Error: Repository URL is required");
    console.log(
      '\nUsage: node amp-repo-automation.js <repo-url> "<amp-prompt>" [branch]',
    );
    process.exit(1);
  }

  if (!ampPrompt) {
    console.error("❌ Error: Amp prompt is required");
    console.log(
      '\nUsage: node amp-repo-automation.js <repo-url> "<amp-prompt>" [branch]',
    );
    process.exit(1);
  }

  // Extract repo name from URL for the temp directory
  const repoName = path
    .basename(repoUrl, ".git")
    .replace(/[^a-zA-Z0-9-_]/g, "_");
  const tempDir = path.join(
    os.tmpdir(),
    `amp-automation-${repoName}-${Date.now()}`,
  );

  console.log("🚀 Starting Amp Repository Automation");
  console.log("=====================================");
  console.log(`📦 Repository: ${repoUrl}`);
  console.log(`🌿 Branch: ${branch}`);
  console.log(`📁 Working directory: ${tempDir}`);
  console.log(`💬 Amp prompt: "${ampPrompt}"`);

  try {
    // Step 1: Clone the repository
    console.log("\n📥 Step 1: Cloning repository...");
    runCommand(
      `git clone --branch ${branch} --single-branch "${repoUrl}" "${tempDir}"`,
    );

    // Step 2: Run Amp CLI
    console.log("\n🤖 Step 2: Running Amp CLI...");
    await runAmpCli(tempDir, ampPrompt);

    // Step 3: Check for changes
    console.log("\n🔍 Step 3: Checking for changes...");
    const status = runCommand("git status --porcelain", { cwd: tempDir });

    if (!status) {
      console.log("ℹ️  No changes detected. Nothing to commit.");
      cleanup(tempDir);
      return;
    }

    console.log("📝 Changes detected:");
    console.log(status);

    // Step 4: Stage and commit changes
    console.log("\n📦 Step 4: Staging and committing changes...");
    runCommand("git add -A", { cwd: tempDir });

    const commitMessage = process.env.COMMIT_MESSAGE || DEFAULT_COMMIT_MESSAGE;
    runCommand(`git commit -m "${commitMessage}"`, { cwd: tempDir });

    // Step 5: Push changes
    console.log("\n🚀 Step 5: Pushing changes...");
    runCommand(`git push origin ${branch}`, { cwd: tempDir });

    console.log("\n✅ Automation completed successfully!");
    console.log(`📊 Changes have been pushed to ${branch}`);

    // Cleanup
    cleanup(tempDir);
  } catch (error) {
    console.error(`\n❌ Automation failed: ${error.message}`);
    cleanup(tempDir);
    process.exit(1);
  }
}

/**
 * Cleans up the temporary directory.
 * @param {string} dir - The directory to remove
 */
function cleanup(dir) {
  console.log(`\n🧹 Cleaning up temporary directory: ${dir}`);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("✅ Cleanup complete");
  } catch (error) {
    console.warn(`⚠️  Could not clean up directory: ${error.message}`);
  }
}

// Parse command line arguments and run
const [, , repoUrl, ampPrompt, branch] = process.argv;
main(repoUrl, ampPrompt, branch);
