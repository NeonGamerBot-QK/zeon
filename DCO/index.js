const validator = require("email-validator");
const getDCOStatus = async function (
  commits,
  isRequiredFor,
  prURL,
  allowRemediationCommits,
) {
  const failed = [];

  for (const { commit, author, parents, sha } of commits) {
    const isMerge = parents && parents.length > 1;

    const signoffRequired = !author || (await isRequiredFor(author.login));
    if (isMerge || (!signoffRequired && commit.verification.verified)) {
      continue;
    } else if (author && author.type === "Bot") {
      continue;
    }

    const commitInfo = {
      sha,
      url: `${prURL}/commits/${sha}`,
      author: commit.author.name,
      email: commit.author.email,
      committer: commit.committer.name,
      message: "",
    };

    const signoffs = getSignoffs(commit, sha, commits, allowRemediationCommits);

    if (signoffs.length === 0) {
      // no signoffs found
      if (signoffRequired) {
        commitInfo.message = "The sign-off is missing.";
        failed.push(commitInfo);
      } else {
        commitInfo.message = "Commit by organization member is not verified.";
        failed.push(commitInfo);
      }

      continue;
    }

    // Check to be sure the author and committer emails are actual valid email addresses
    const email = commit.author.email || commit.committer.email;
    if (!validator.validate(email)) {
      commitInfo.message = `${email} is not a valid email address.`;
      failed.push(commitInfo);
      continue;
    }

    const authors = [
      commit.author.name.toLowerCase(),
      commit.committer.name.toLowerCase(),
    ];
    const emails = [
      commit.author.email.toLowerCase(),
      commit.committer.email.toLowerCase(),
    ];
    if (signoffs.length === 1) {
      // commit contains one signoff
      const sig = signoffs[0];
      // if the signoff is an explicit match or an individual remediation, check if signoff name and email match the commit
      // if the signoff is from a third-party remediation and passed the tests in getSignoffs, it is valid
      if (
        ["explicit", "individualRemediation"].includes(sig.type) &&
        (!authors.includes(sig.name.toLowerCase()) ||
          !emails.includes(sig.email.toLowerCase()))
      ) {
        commitInfo.message = `Expected "${commit.author.name} <${commit.author.email}>", but got "${sig.name} <${sig.email}>".`;
        failed.push(commitInfo);
      }
    } else {
      // commit contains multiple signoffs
      // first, find explicit signoffs which match the author exactly
      const valid = signoffs.filter(
        (signoff) =>
          authors.includes(signoff.name.toLowerCase()) &&
          emails.includes(signoff.email.toLowerCase()) &&
          signoff.type === "explicit",
      );
      // next, find individual remediations which match the author exactly
      const validIndividualRemediation = signoffs.filter(
        (signoff) =>
          authors.includes(signoff.name.toLowerCase()) &&
          emails.includes(signoff.email.toLowerCase()) &&
          signoff.type === "individualRemediation",
      );
      // if the signoff is from a third-party remediation and passed the tests in getSignoffs, it is valid
      const validThirdPartyRemediation = signoffs.filter(
        (signoff) => signoff.type === "thirdPartyRemediation",
      );

      // fail if no signoffs of any type match author's name and email
      if (
        valid.length === 0 &&
        validIndividualRemediation.length === 0 &&
        validThirdPartyRemediation.length === 0
      ) {
        const got = signoffs
          .map((sig) => `"${sig.name} <${sig.email}>"`)
          .join(", ");
        commitInfo.message = `Can not find "${commit.author.name} <${commit.author.email}>", in [${got}].`;
        failed.push(commitInfo);
      }
    } // end if
  } // end for

  return failed.sort((a, b) => a.author.localeCompare(b.author));
};

function getSignoffs(
  comparisonCommit,
  comparisonSha,
  allCommits,
  allowRemediationCommits,
) {
  const regex = /^Signed-off-by: (.*) <(.*)>\s*$/gim;
  const matches = [];
  let match;
  while ((match = regex.exec(comparisonCommit.message)) !== null) {
    matches.push({
      name: match[1],
      email: match[2],
      type: "explicit",
    });
  }

  if (allowRemediationCommits.individual) {
    // if individual remediation commits are allowed, look for one in the PR with a matching sha

    for (const { commit } of allCommits) {
      let remediationMatch;

      // if individual commits are allowed, look for one in the PR with a matching sha
      const remediationRegexIndividual =
        /^I, (.*) <(.*)>, hereby add my Signed-off-by to this commit: (.*)\s*$/gim;
      while (
        (remediationMatch = remediationRegexIndividual.exec(commit.message)) !==
        null
      ) {
        // make sure the commit author matches the author being Signed-off-by for
        if (
          remediationMatch[3] === comparisonSha &&
          comparisonCommit.author.name.toLowerCase() ===
            commit.author.name.toLowerCase() &&
          comparisonCommit.author.name.toLowerCase() ===
            remediationMatch[1].toLowerCase() &&
          comparisonCommit.author.email.toLowerCase() ===
            commit.author.email.toLowerCase() &&
          comparisonCommit.author.email.toLowerCase() ===
            remediationMatch[2].toLowerCase()
        ) {
          matches.push({
            name: remediationMatch[1],
            email: remediationMatch[2],
            type: "individualRemediation",
          });
        } // end if
      } // end while

      if (allowRemediationCommits.thirdParty) {
        // if 3rd party commits are allowed, look for one in the PR with a matching sha
        const remediationRegexThirdParty =
          /^On behalf of (.*) <(.*)>, I, (.*) <(.*)>, hereby add my Signed-off-by to this commit: (.*)\s*$/gim;
        while (
          (remediationMatch = remediationRegexThirdParty.exec(
            commit.message,
          )) !== null
        ) {
          // make sure the commit author or committer matches the person claiming to do the third-party remediation, and that the signoff matches the original failing commit

          if (
            remediationMatch[5] === comparisonSha &&
            comparisonCommit.author.name.toLowerCase() ===
              remediationMatch[1].toLowerCase() &&
            comparisonCommit.author.email.toLowerCase() ===
              remediationMatch[2].toLowerCase() &&
            ((commit.author.name.toLowerCase() ===
              remediationMatch[3].toLowerCase() &&
              commit.author.email.toLowerCase() ===
                remediationMatch[4].toLowerCase()) ||
              (commit.committer.name.toLowerCase() ===
                remediationMatch[3].toLowerCase() &&
                commit.committer.email.toLowerCase() ===
                  remediationMatch[4].toLowerCase()))
          ) {
            matches.push({
              name: remediationMatch[1],
              email: remediationMatch[2],
              type: "thirdPartyRemediation",
            });
          } // end if
        } // end while
      } // end if
    } // end if
  } // end if

  return matches;
}
const requireMembers = function (requireForMembers, context) {
  // If members are required to sign-off, then always require sign-off
  if (requireForMembers) {
    return async () => true;
  }

  // If repository belongs to an organization, check if user is a member
  if (context.payload.organization) {
    const members = {};

    return async (login) => {
      let member;
      if (login in members) member = members[login];
      else {
        // https://docs.github.com/en/rest/reference/orgs#check-organization-membership-for-a-user
        member = await context.octokit.orgs
          .checkMembershipForUser({
            org: context.payload.organization.login,
            username: login,
          })
          .catch((err) => {
            /* istanbul ignore next - unexpected error */
            if (err.status !== 404) throw err;
            return false;
          });
        members[login] = member;
      }

      return !member;
    };
  }

  // If repository does not belong to an organization, check if user is the owner of the repository
  const owner = context.payload.repository.owner.login;
  return async (login) => {
    return login !== owner;
  };
};

/**
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.synchronize",
      "check_run.rerequested",
    ],
    check,
  );

  async function check(context) {
    const timeStart = new Date();

    // const config = await context.config("dco.yml", {
    //   require: {
    //     members: true,
    //   },
    //   allowRemediationCommits: {
    //     individual: false,
    //     thirdParty: false,
    //   },
    // });
    const config = {
      require: {
        members: true,
      },
      allowRemediationCommits: {
        individual: false,
        thirdParty: false,
      },
    };
    const requireForMembers = config.require.members;
    const allowRemediationCommits = config.allowRemediationCommits;

    const pr = context.payload.pull_request;

    const compare = await context.octokit.repos.compareCommits(
      context.repo({
        base: pr.base.sha,
        head: pr.head.sha,
      }),
    );

    const commits = compare.data.commits;
    const dcoFailed = await getDCOStatus(
      commits,
      requireMembers(requireForMembers, context),
      context.payload.pull_request.html_url,
      allowRemediationCommits,
    );

    if (!dcoFailed.length) {
      await context.octokit.checks
        .create(
          context.repo({
            name: "DCO",
            head_branch: pr.head.ref,
            head_sha: pr.head.sha,
            status: "completed",
            started_at: timeStart,
            conclusion: "success",
            completed_at: new Date(),
            output: {
              title: "DCO",
              summary: "All commits are signed off!",
            },
          }),
        )
        .catch(function checkFails(error) {
          /* istanbul ignore next - unexpected error */
          if (error.status !== 403) throw error;

          context.log.info("resource not accessible, creating status instead");
          // create status
          const params = {
            sha: pr.head.sha,
            context: "DCO",
            state: "success",
            description: "All commits are signed off!",
            target_url: "https://github.com/probot/dco#how-it-works",
          };
          return context.octokit.repos.createCommitStatus(context.repo(params));
        });
    } else {
      let summary = [];
      dcoFailed.forEach(function (commit) {
        summary.push(
          `Commit sha: [${commit.sha.substr(0, 7)}](${commit.url}), Author: ${
            commit.author
          }, Committer: ${commit.committer}; ${commit.message}`,
        );
      });
      summary = summary.join("\n");

      summary =
        handleCommits(pr, commits.length, dcoFailed, allowRemediationCommits) +
        `\n\n### Summary\n\n${summary}`;

      await context.octokit.checks
        .create(
          context.repo({
            name: "DCO",
            head_branch: pr.head.ref,
            head_sha: pr.head.sha,
            status: "completed",
            started_at: timeStart,
            conclusion: "action_required",
            completed_at: new Date(),
            output: {
              title: "DCO",
              summary,
            },
            actions: [
              {
                label: "Set DCO to pass",
                description: "would set status to passing",
                identifier: "override",
              },
            ],
          }),
        )
        .catch(function checkFails(error) {
          /* istanbul ignore next - unexpected error */
          if (error.status !== 403) throw error;

          context.log.info("resource not accessible, creating status instead");
          // create status
          const description = dcoFailed[dcoFailed.length - 1].message.substring(
            0,
            140,
          );
          const params = {
            sha: pr.head.sha,
            context: "DCO",
            state: "failure",
            description,
            target_url: "https://github.com/probot/dco#how-it-works",
          };
          return context.octokit.repos.createCommitStatus(context.repo(params));
        });
    }
  }

  // This option is only presented to users with Write Access to the repo
  app.on("check_run.requested_action", setStatusPass);
  async function setStatusPass(context) {
    const timeStart = new Date();

    await context.octokit.checks.create(
      context.repo({
        name: "DCO",
        head_branch: context.payload.check_run.check_suite.head_branch,
        head_sha: context.payload.check_run.head_sha,
        status: "completed",
        started_at: timeStart,
        conclusion: "success",
        completed_at: new Date(),
        output: {
          title: "DCO",
          summary: "Commit sign-off was manually approved.",
        },
      }),
    );
  }
};

function handleCommits(pr, commitLength, dcoFailed, allowRemediationCommits) {
  let returnMessage = "";

  if (dcoFailed.length === 1) {
    returnMessage =
      "There is one commit incorrectly signed off.  This means that the author of this commit failed to include a Signed-off-by line in the commit message.\n\n";
  } else {
    returnMessage = `There are ${dcoFailed.length} commits incorrectly signed off.  This means that the author(s) of these commits failed to include a Signed-off-by line in their commit message.\n\n`;
  }

  returnMessage =
    returnMessage +
    `To avoid having PRs blocked in the future, always include \`Signed-off-by: Author Name <authoremail@example.com>\` in *every* commit message. You can also do this automatically by using the -s flag (i.e., \`git commit -s\`).

Here is how to fix the problem so that this code can be merged.\n\n`;

  let rebaseWarning = "";

  if (
    allowRemediationCommits.individual ||
    allowRemediationCommits.thirdParty
  ) {
    returnMessage =
      returnMessage +
      `---\n\n### Preferred method: Commit author adds a DCO remediation commit

A *DCO Remediation Commit* contains special text in the commit message that applies a missing Signed-off-by line in a subsequent commit.  The primary benefit of this method is that the project’s history does not change, and there is no risk of breaking someone else’s work.

These authors can unblock this PR by adding a new commit to this branch with the following text in their commit message:\n`;

    let currentAuthor = "";
    dcoFailed.forEach(function (commit, index, dcoFailed) {
      // If the author has changed, we need to write a new section and close any old sections
      if (currentAuthor !== commit.author + " <" + commit.email + ">") {
        // If currentAuthor was already defined it's the end of a section, so write the Signed-off-by
        if (currentAuthor) {
          returnMessage =
            returnMessage + `\nSigned-off-by: ${currentAuthor}\n\`\`\`\n`;
        }
        // Update the currentAuthor and write a new section
        currentAuthor = commit.author + " <" + commit.email + ">";
        returnMessage =
          returnMessage +
          `#### ${commit.author} &lt;${commit.email}&gt;\n\`\`\`\nDCO Remediation Commit for ${commit.author} <${commit.email}>\n\n`;
      }
      // Draft the magic DCO remediation commit text for the author
      // returnMessage = returnMessage + `I, ${commit.author} <${commit.email}> ${commit.sha}\n`
      returnMessage =
        returnMessage +
        `I, ${currentAuthor}, hereby add my Signed-off-by to this commit: ${commit.sha}\n`;

      if (index === dcoFailed.length - 1) {
        returnMessage =
          returnMessage + `\nSigned-off-by: ${currentAuthor}\n\`\`\`\n`;
      }
    });

    returnMessage =
      returnMessage +
      "\n\nPlease note: You should avoid adding empty commits (i.e., `git commit -s --allow-empty`), because these will be discarded if someone rebases the branch / repo.\n";

    if (allowRemediationCommits.thirdParty) {
      returnMessage =
        returnMessage +
        `\n---\n\n### Alternate method: An employer adds a DCO Remediation Commit

If the contents of this commit were contributed on behalf of a third party (generally, the author’s employer), an authorized individual may add a Third-Party DCO Remediation Commit.  This may be necessary if the original author is unavailable to add their own DCO Remediation Commit to this branch.

If you are about to add a Third-Party DCO Remediation Commit under DCO section (b) or (c), be sure you are authorized by your employer to take this action.  Generally speaking, maintainers and other project contributors cannot sign off on behalf of project contributors, unless there is some relationship which permits this action.  It is your responsibility to verify this.

This PR can be unblocked by an authorized third party adding one or more new commits to this branch with the following text in the commit message.  Replace YOUR_COMPANY with your company name, YOUR_NAME with the name of the authorized representative, and YOUR_EMAIL with the representative’s email address.

For the sake of clarity, please use a separate commit per author:\n`;

      currentAuthor = "";
      dcoFailed.forEach(function (commit, index, dcoFailed) {
        // If the author has changed, we need to write a new section and close any old sections
        if (currentAuthor !== commit.author + " <" + commit.email + ">") {
          // If currentAuthor was already defined it's the end of a section, so write the Signed-off-by
          if (currentAuthor) {
            returnMessage =
              returnMessage + "\nSigned-off-by: YOUR_NAME <YOUR_EMAIL>\n```\n";
          }
          // Update the currentAuthor and write a new section
          currentAuthor = commit.author + " <" + commit.email + ">";
          returnMessage =
            returnMessage +
            `#### On behalf of ${commit.author} &lt;${commit.email}&gt;\n\`\`\`\nThird-Party DCO Remediation Commit for ${commit.author} <${commit.email}>\n\n`;
        }
        // Draft the magic DCO remediation commit text for the author
        // returnMessage = returnMessage + `Retroactive-signed-off-by: ${commit.author} <${commit.email}> ${commit.sha}\n`
        returnMessage =
          returnMessage +
          `On behalf of ${commit.author} <${commit.email}>, I, YOUR_NAME <YOUR_EMAIL>, hereby add my Signed-off-by to this commit: ${commit.sha}\n`;

        if (index === dcoFailed.length - 1) {
          returnMessage =
            returnMessage + "\nSigned-off-by: YOUR_NAME <YOUR_EMAIL>\n```\n";
        }
      });
    }
    rebaseWarning = "Least preferred method: ";
  }

  returnMessage =
    returnMessage +
    "\n---\n\n### " +
    rebaseWarning +
    `Rebase the branch

If you have a local git environment and meet the criteria below, one option is to rebase the branch and add your Signed-off-by lines in the new commits.  Please note that if others have already begun work based upon the commits in this branch, this solution will rewrite history and may cause serious issues for collaborators ([described in the git documentation](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) under "The Perils of Rebasing").

You should only do this if:

* You are the only author of the commits in this branch
* You are absolutely certain nobody else is doing any work based upon this branch
* There are no empty commits in the branch (for example, a DCO Remediation Commit which was added using \`--allow-empty\`)

To add your Signed-off-by line to every commit in this branch:

1. Ensure you have a local copy of your branch by [checking out the pull request locally via command line](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/checking-out-pull-requests-locally).
1. In your local branch, run: \`git rebase HEAD~${commitLength} --signoff\`
1. Force push your changes to overwrite the branch: \`git push --force-with-lease origin ${pr.head.ref}\`\n\n---\n\n`;

  return returnMessage;
}
