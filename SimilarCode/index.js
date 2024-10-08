module.exports = (app) => {

    
    async function similarSearch(context) {
        const repoName = context.payload.pull_request.head.repo.full_name;

        const contents = [];
        const issue = context.issue();
        const allFiles = await context.octokit.pullRequests.listFiles(issue);
        for (const file of allFiles.data) {

            // Deleted lines
            const deletedLines = file.patch.match(/(\n-)+\s*[^\d-](.*)/g);

            if (!deletedLines) { return; }

            // Create search strings
            for (const line in deletedLines) {
                if (deletedLines.hasOwnProperty(line)) {
                    let content = deletedLines[line].replace(/(\n\s*-)/g, "");
                    content = content.replace(/\s/g, "+");
                    contents.unshift(`${content}+repo:${repoName}`);
                }
            }

            let similarItems = [];
            let contentsLen = contents.length;
            contents.map( (content) => {
                context.github.search.code({q: content}).then((result) => {
                    const searchedItems = result.data.items;

                    similarItems = similarItems.concat(searchedItems);

                    contentsLen -= 1;
                    if (contentsLen === 0) {
                        let similarFiles = similarItems.map((item) => {
                            return "\n* " + item.name + ":" + item.html_url;
                        });

                        similarFiles = similarFiles.filter((x, i, self) => {
                            return self.indexOf(x) === i;
                        });

                        if(similarFiles.length > 0) {
                            const output = `Similar files are\n${similarFiles.toString()}`;
                            const params = context.issue({body: output});
                            context.github.issues.createComment(params);
                        }
                    }
                });
            });
        }
    }
    app.on("pull_request.opened", similarSearch);
};