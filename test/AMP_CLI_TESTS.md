# Amp CLI Integration Tests

This test suite demonstrates how to use the Amp CLI to generate AI-prompted code within your test environment.

## Overview

The Amp CLI is a command-line interface for interacting with the Amp AI agent. These tests show how to:

- Generate code using AI via the Amp CLI
- Create test suites programmatically
- Generate documentation and configuration files
- Validate generated code syntax
- Explain existing code

## Test Files

### `amp-cli.test.js`

Contains comprehensive test examples for using Amp CLI to generate code.

## Running Tests

Run all Amp CLI tests:

```bash
npm test -- test/amp-cli.test.js
```

Run a specific test:

```bash
npm test -- test/amp-cli.test.js -t "should get ai-generated code"
```

Run tests with verbose output:

```bash
npm test -- test/amp-cli.test.js --verbose
```

## Requirements

- Amp CLI must be installed: `which amp`
- Amp CLI must be authenticated: `amp login`
- Active internet connection for AI API calls

## Test Categories

### Amp CLI Integration Tests

Basic tests demonstrating fundamental Amp CLI usage:

- **Verification**: Checks if Amp CLI is installed
- **Code Generation**: Generates JavaScript functions from prompts
- **Test Generation**: Creates Jest test suites
- **File Output**: Saves generated code to files
- **Detailed Specs**: Generates code with complex requirements
- **Syntax Validation**: Validates generated JavaScript
- **Code Explanation**: Gets explanations for existing code

### Project-Specific Code Generation

Tests tailored for this project's tech stack (Probot, GitHub Actions):

- **Probot Handlers**: Generate webhook handlers
- **GitHub API**: Create octokit-based code
- **GitHub Actions**: Generate workflow YAML files
- **Documentation**: Create markdown docs

### Tool Invocation

Tests for interacting with Amp tools:

- **List Tools**: Shows available tools
- **Tool Details**: Displays tool information

## Example Usage

### Generate a Function

```javascript
const prompt = 'Write a function that validates email addresses in JavaScript';
const result = execSync(`echo "${prompt}" | amp -m free`, { encoding: 'utf-8' });
// result contains generated function code
```

### Generate Test Code

```javascript
const testPrompt = `Write Jest tests for a sum function that:
- adds two numbers
- handles null values
- handles undefined values`;

const testCode = execSync(`echo "${testPrompt}" | amp -m free`, { encoding: 'utf-8' });
```

### Save Generated Code

```javascript
const code = execSync(`echo "${prompt}" | amp -m free`, { encoding: 'utf-8' });
fs.writeFileSync('generated-function.js', code, 'utf-8');
```

## Amp CLI Commands Used

### Free Mode

```bash
echo "prompt" | amp -m free
```

Sends a prompt to the Amp agent in free mode and returns the response. This is ideal for getting generated code in tests using the free tier.

### List Tools

```bash
amp tools list
```

Shows all available tools the Amp agent can use.

### Show Tool Details

```bash
amp tools show ToolName
```

Displays detailed information about a specific tool.

## Timeout Considerations

Amp CLI requests may take time depending on:
- Network latency
- Prompt complexity
- AI model processing time

Tests use a 30-second timeout by default. Increase if needed:

```javascript
execSync(cmd, { timeout: 60000 }); // 60 seconds
```

## Authentication

If tests fail with authentication errors:

```bash
amp login
```

Then provide your Amp API key from https://ampcode.com/settings

## Debugging

Enable verbose logging:

```javascript
execSync(cmd, { stdio: 'inherit' }); // Shows all output
```

Check logs:

```bash
amp --log-level debug
cat ~/.cache/amp/logs/cli.log
```

## Best Practices

1. **Specific Prompts**: More detailed prompts generate better code
2. **Clear Instructions**: Tell the AI what format you expect (function code only, YAML, etc.)
3. **Error Handling**: Generated code may need refinement; validate before using in production
4. **Timeouts**: Account for network latency in test timeouts
5. **Parsing**: Use try/catch when parsing AI-generated code

## Use Cases

- **Code Generation Tests**: Verify AI-generated code meets requirements
- **CI/CD Integration**: Generate code as part of build pipeline
- **Documentation**: Auto-generate README sections
- **Configuration**: Generate workflow files and configs
- **Learning**: Use tests as examples of Amp CLI capabilities

## Limitations

- Requires network connectivity
- API calls may have rate limits
- Generated code quality depends on prompt clarity
- Some prompts may timeout
- Code may require post-processing or refinement

## Resources

- [Amp Documentation](https://ampcode.com)
- [GitHub Probot](https://probot.github.io)
- [Jest Testing Framework](https://jestjs.io)
