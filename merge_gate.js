const DATABASE_PATH_PREFIX = "db/";
const DATABASE_SCHEMA_PATH = "db/schema.js";
const DATABASE_MIGRATION_PREFIX = "db/migrations/";

/**
 * Checks whether a repository path belongs to the database directory.
 *
 * @param {string} filename
 * @returns {boolean}
 */
function isDatabaseFile(filename) {
  return filename.startsWith(DATABASE_PATH_PREFIX);
}

/**
 * Checks whether a changed file is a newly generated Drizzle SQL migration.
 * Existing migrations must not be edited to satisfy a new schema change.
 *
 * @param {object} file
 * @returns {boolean}
 */
function isNewDatabaseMigration(file) {
  return (
    file.status === "added" &&
    file.filename.startsWith(DATABASE_MIGRATION_PREFIX) &&
    file.filename.endsWith(".sql")
  );
}

/**
 * Checks whether a database PR changes the schema without adding a migration.
 *
 * @param {object} pullRequest
 * @returns {boolean}
 */
function hasSchemaChangeWithoutMigration(pullRequest) {
  const databaseFiles = pullRequest.databaseFiles || [];
  const schemaChanged = databaseFiles.some(
    (file) =>
      file.filename === DATABASE_SCHEMA_PATH ||
      file.previous_filename === DATABASE_SCHEMA_PATH,
  );
  return schemaChanged && !databaseFiles.some(isNewDatabaseMigration);
}

/**
 * Lists open pull requests that edit at least one file under db/.
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<object[]>}
 */
async function listOpenDatabasePullRequests(octokit, owner, repo) {
  const openPullRequests = await octokit.paginate(octokit.pulls.list, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

  const pullRequestsWithFiles = await Promise.all(
    openPullRequests.map(async (pullRequest) => {
      const files = await octokit.paginate(octokit.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullRequest.number,
        per_page: 100,
      });
      const changesDatabase = files.some(
        (file) =>
          isDatabaseFile(file.filename) ||
          isDatabaseFile(file.previous_filename || ""),
      );
      return changesDatabase ? { ...pullRequest, databaseFiles: files } : null;
    }),
  );

  return pullRequestsWithFiles.filter(Boolean);
}

/**
 * Returns database-changing PRs that must be handled before the current PR.
 * GitHub assigns increasing PR numbers, making the number a stable ordering.
 *
 * @param {object[]} databasePullRequests
 * @param {number} pullNumber
 * @returns {object[]}
 */
function getNewerDatabasePullRequests(databasePullRequests, pullNumber) {
  const currentPullRequestChangesDatabase = databasePullRequests.some(
    (pullRequest) => pullRequest.number === pullNumber,
  );
  if (!currentPullRequestChangesDatabase) return [];

  return databasePullRequests
    .filter((pullRequest) => pullRequest.number > pullNumber)
    .sort(
      (firstPullRequest, secondPullRequest) =>
        secondPullRequest.number - firstPullRequest.number,
    );
}

module.exports = {
  getNewerDatabasePullRequests,
  hasSchemaChangeWithoutMigration,
  isDatabaseFile,
  isNewDatabaseMigration,
  listOpenDatabasePullRequests,
};
