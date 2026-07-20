const {
  getNewerDatabasePullRequests,
  hasSchemaChangeWithoutMigration,
  isDatabaseFile,
  isNewDatabaseMigration,
  listOpenDatabasePullRequests,
} = require("../merge_gate");

describe("merge gate database ordering", () => {
  test("recognizes only files inside db/", () => {
    expect(isDatabaseFile("db/schema.sql")).toBe(true);
    expect(isDatabaseFile("db/migrations/001.sql")).toBe(true);
    expect(isDatabaseFile("database/schema.sql")).toBe(false);
    expect(isDatabaseFile("src/db/schema.sql")).toBe(false);
  });

  test("blocks a database PR behind newer database PRs", () => {
    const databasePullRequests = [
      { number: 12 },
      { number: 10 },
      { number: 15 },
    ];

    expect(
      getNewerDatabasePullRequests(databasePullRequests, 10).map(
        (pullRequest) => pullRequest.number,
      ),
    ).toEqual([15, 12]);
    expect(getNewerDatabasePullRequests(databasePullRequests, 15)).toEqual([]);
    expect(getNewerDatabasePullRequests(databasePullRequests, 11)).toEqual([]);
  });

  test("requires a newly added SQL migration for schema changes", () => {
    const schemaFile = { filename: "db/schema.js", status: "modified" };
    const newMigration = {
      filename: "db/migrations/0016_add_users.sql",
      status: "added",
    };
    const editedMigration = {
      filename: "db/migrations/0015_existing.sql",
      status: "modified",
    };

    expect(
      hasSchemaChangeWithoutMigration({ databaseFiles: [schemaFile] }),
    ).toBe(true);
    expect(
      hasSchemaChangeWithoutMigration({
        databaseFiles: [schemaFile, newMigration],
      }),
    ).toBe(false);
    expect(
      hasSchemaChangeWithoutMigration({
        databaseFiles: [schemaFile, editedMigration],
      }),
    ).toBe(true);
    expect(isNewDatabaseMigration(newMigration)).toBe(true);
    expect(isNewDatabaseMigration(editedMigration)).toBe(false);
  });

  test("lists open pull requests that modify db files", async () => {
    const list = Symbol("list");
    const listFiles = Symbol("listFiles");
    const octokit = {
      pulls: { list, listFiles },
      paginate: async (request, parameters) => {
        if (request === list) {
          return [{ number: 10 }, { number: 11 }, { number: 12 }];
        }
        if (parameters.pull_number === 11) {
          return [{ filename: "db/schema.sql" }];
        }
        if (parameters.pull_number === 12) {
          return [
            {
              filename: "archive/schema.sql",
              previous_filename: "db/schema.sql",
            },
          ];
        }
        return [{ filename: "src/index.js" }];
      },
    };

    await expect(
      listOpenDatabasePullRequests(octokit, "owner", "repo"),
    ).resolves.toEqual([
      {
        number: 11,
        databaseFiles: [{ filename: "db/schema.sql" }],
      },
      {
        number: 12,
        databaseFiles: [
          {
            filename: "archive/schema.sql",
            previous_filename: "db/schema.sql",
          },
        ],
      },
    ]);
  });
});
