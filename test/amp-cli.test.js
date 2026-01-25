const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Utility function to test Amp CLI availability
 */
async function checkAmpCliAvailable() {
  try {
    execSync("amp --version", { encoding: "utf-8" });
    return true;
  } catch {
    console.error("Error: Amp CLI not found. Install it before running tests.");
    return false;
  }
}

// Create a temp directory for all tests
const TEMP_DIR = path.join(__dirname, "amp-test-temp-" + Date.now());
const ensureTempDir = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
};

/**
 * Utility function to run Amp CLI command in free mode
 * Writes prompt to stdin of amp process
 * @param {string} prompt - The prompt to send to Amp
 * @returns {Promise<string>} - The response from Amp
 */
async function runAmpFreeMode(prompt) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const amp = spawn("amp", ["-m", "free"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      timeout: 30000,
    });

    amp.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    amp.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    amp.on("close", (code) => {
      if (code !== 0 && stderr) {
        console.error("Amp CLI error:", stderr);
        resolve(null);
      } else {
        resolve(stdout);
      }
    });

    amp.on("error", (error) => {
      console.error("Error running Amp CLI:", error.message);
      resolve(null);
    });

    // Write prompt to stdin
    amp.stdin.write(prompt);
    amp.stdin.end();
  });
}

/**
 * Utility function to write generated code to a file
 * @param {string} filename - Name of the file to save
 * @param {string} content - Content to write
 * @returns {string} - Full path to written file
 */
function saveGeneratedCode(filename, content) {
  ensureTempDir();
  const filepath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filepath, content, "utf-8");
  return filepath;
}

/**
 * Test: Verify Amp CLI is installed and accessible
 */
async function testAmpCliInstalled() {
  console.log("\n[Test 1] Checking if Amp CLI is installed...");
  const available = await checkAmpCliAvailable();
  if (available) {
    console.log("✓ Amp CLI is installed and accessible");
  } else {
    console.log("✗ Amp CLI not found");
  }
}

/**
 * Test: Get AI-generated code using Amp CLI in free mode
 */
async function testGenerateEmailValidation() {
  console.log("\n[Test 2] Testing AI-generated email validation code...");
  const prompt =
    "Write a JavaScript function that validates if a string is a valid email address. Return only the function code without explanations.";

  const result = await runAmpFreeMode(prompt);
  if (result && result.length > 0) {
    const filepath = saveGeneratedCode("email-validation.js", result);
    console.log("✓ Generated code received and saved to:", filepath);
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to generate code or timed out", result);
  }
}

/**
 * Test: Generate test code using Amp CLI
 */
async function testGenerateJestTest() {
  console.log("\n[Test 3] Testing Jest test generation...");
  const prompt = `Write a Jest test suite for a function that adds two numbers.
Include tests for positive numbers, negative numbers, and edge cases.
Return only the test code without explanations.`;

  const result = await runAmpFreeMode(prompt);
  if (result && result.length > 0 && /describe|test|expect/i.test(result)) {
    const filepath = saveGeneratedCode("add-function.test.js", result);
    console.log("✓ Generated test code received and saved to:", filepath);
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to generate valid test code");
  }
}

/**
 * Test: Generate and save AI code to file
 */
async function testGenerateAndSaveCode() {
  console.log("\n[Test 4] Testing code generation and file saving...");

  const prompt =
    "Create a JavaScript function that converts Celsius to Fahrenheit. return code only";

  try {
    const result = await runAmpFreeMode(prompt);
    if (result && result.length > 0) {
      const filepath = saveGeneratedCode("celsius-to-fahrenheit.js", result);
      const content = fs.readFileSync(filepath, "utf-8");
      console.log("✓ Code generated and saved to:", filepath);
      console.log("File size:", content.length, "bytes");
    } else {
      console.log("✗ Failed to generate code");
    }
  } catch (error) {
    console.error("✗ Error:", error.message);
  }
}

/**
 * Test: Generate code with detailed specifications
 */
async function testGenerateDetailedCode() {
  console.log(
    "\n[Test 5] Testing code generation with detailed specifications...",
  );
  const prompt = `Create a Node.js function with these requirements:
1. Accept an array of objects with 'id' and 'value' properties
2. Filter where value > 10
3. Sort by value descending
4. Return array of just the ids
5. Include error handling for invalid input
Return only the function code without explanations.`;

  const result = await runAmpFreeMode(prompt);
  if (result && result.length > 0 && /(function|const)/.test(result)) {
    const filepath = saveGeneratedCode("filter-and-sort.js", result);
    console.log(
      "✓ Generated code with specifications received and saved to:",
      filepath,
    );
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to generate code");
  }
}

/**
 * Test: Validate that generated JavaScript code is syntactically valid
 */
async function testValidJavaScriptSyntax() {
  console.log("\n[Test 6] Testing JavaScript syntax validation...");
  const prompt = `Write a simple JavaScript function that returns an object with properties name and age.
Return only the function code, nothing else.`;

  const result = await runAmpFreeMode(prompt);
  if (result && result.length > 0) {
    try {
      // Basic syntax validation
      new Function(result);
      const filepath = saveGeneratedCode("user-object.js", result);
      console.log(
        "✓ Generated code is syntactically valid and saved to:",
        filepath,
      );
    } catch (syntaxError) {
      console.warn("⚠ Generated code has syntax issues:", syntaxError.message);
    }
  } else {
    console.log("✗ Failed to generate code");
  }
}

/**
 * Test: Use Amp CLI to explain existing code
 */
async function testExplainCode() {
  console.log("\n[Test 7] Testing code explanation...");
  const prompt = `Explain what this function does:
function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}
Keep explanation brief.`;

  const result = await runAmpFreeMode(prompt);
  if (result && result.length > 0 && /(prime|number|check)/i.test(result)) {
    const filepath = saveGeneratedCode("explanation-isPrime.txt", result);
    console.log("✓ Generated explanation received and saved to:", filepath);
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to explain code");
  }
}

/**
 * Test: Generate Probot webhook handler via Amp
 */
async function testGenerateProbotHandler() {
  console.log("\n[Test 8] Testing Probot webhook handler generation...");
  const prompt = `Generate a Probot webhook handler for the "issues" event that:
1. Checks if an issue has a specific label
2. If label matches, add a comment to the issue
3. Include proper error handling
Language: JavaScript
Keep it concise and follow Probot conventions.
Return only the handler code without explanations.`;

  const result = await runAmpFreeMode(prompt);
  if (
    result &&
    result.length > 0 &&
    /(context|github|issue|handler)/i.test(result)
  ) {
    const filepath = saveGeneratedCode("probot-handler.js", result);
    console.log(
      "✓ Generated Probot handler code received and saved to:",
      filepath,
    );
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to generate Probot handler code");
  }
}

/**
 * Test: Generate GitHub API interaction code
 */
async function testGenerateGitHubApiCode() {
  console.log("\n[Test 9] Testing GitHub API code generation...");
  const prompt = `Generate JavaScript code using octokit that:
1. Lists all pull requests for a repository
2. Filters PRs by a specific label
3. Gets comment count for each PR
4. Returns array of objects with PR number and comment count
Use async/await and include error handling.
Return only the function code without explanations.`;

  const result = await runAmpFreeMode(prompt);
  if (
    result &&
    result.length > 0 &&
    /(octokit|github|pull|async)/i.test(result)
  ) {
    const filepath = saveGeneratedCode("github-api-handler.js", result);
    console.log("✓ Generated GitHub API code received and saved to:", filepath);
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to generate GitHub API code");
  }
}

/**
 * Test: Generate GitHub Actions workflow
 */
async function testGenerateGitHubWorkflow() {
  console.log("\n[Test 10] Testing GitHub Actions workflow generation...");
  const prompt = `Generate a GitHub Actions workflow YAML file that:
1. Triggers on push to main branch
2. Runs npm test
3. Runs linter
4. Uploads coverage reports
Keep it simple and well-commented.`;

  const result = await runAmpFreeMode(prompt);
  if (
    result &&
    result.length > 0 &&
    /(name|jobs|runs|steps|push)/i.test(result)
  ) {
    const filepath = saveGeneratedCode("ci-workflow.yml", result);
    console.log(
      "✓ Generated GitHub Actions workflow received and saved to:",
      filepath,
    );
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to generate GitHub Actions workflow");
  }
}

/**
 * Test: Generate markdown documentation
 */
async function testGenerateDocumentation() {
  console.log("\n[Test 11] Testing markdown documentation generation...");
  const prompt = `Generate a README section documenting a JavaScript function that:
- Takes a URL string as input
- Parses it and extracts query parameters
- Returns an object with parameter names as keys
Include usage examples.`;

  const result = await runAmpFreeMode(prompt);
  if (
    result &&
    result.length > 0 &&
    /(function|usage|example|parameter)/i.test(result)
  ) {
    const filepath = saveGeneratedCode("url-parser-docs.md", result);
    console.log("✓ Generated documentation received and saved to:", filepath);
    console.log("Generated output preview:", result.substring(0, 150) + "...");
  } else {
    console.log("✗ Failed to generate documentation");
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║        Amp CLI Integration Test Suite                  ║");
  console.log("║         (Running in Amp Free Mode)                     ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  const isAmpAvailable = await checkAmpCliAvailable();
  if (!isAmpAvailable) {
    console.error("\nCannot proceed: Amp CLI is not installed or not in PATH");
    process.exit(1);
  }

  try {
    // Run all tests sequentially
    await testAmpCliInstalled();
    await testGenerateEmailValidation();
    await testGenerateJestTest();
    await testGenerateAndSaveCode();
    await testGenerateDetailedCode();
    await testValidJavaScriptSyntax();
    await testExplainCode();
    await testGenerateProbotHandler();
    await testGenerateGitHubApiCode();
    await testGenerateGitHubWorkflow();
    await testGenerateDocumentation();

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║            Test Suite Completed                        ║");
    console.log("╚════════════════════════════════════════════════════════╝");
    console.log("\nGenerated files saved to:", TEMP_DIR, "\n");
  } catch (error) {
    console.error("Fatal error during test execution:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
