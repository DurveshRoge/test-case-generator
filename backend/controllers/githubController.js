import { Octokit } from '@octokit/rest';

const parseRepoUrl = (repoUrl) => {
  const url = new URL(repoUrl);
  const pathParts = url.pathname.split('/').filter(p => p);
  if (pathParts.length < 2) {
    throw new Error('Invalid repository URL path. Please use a full URL (e.g., https://github.com/owner/repo).');
  }
  const owner = pathParts[0];
  const repo = pathParts[1].replace(/\.git$/, '');
  return { owner, repo };
};

export const getRepoFiles = async (req, res) => {
  const { repoUrl } = req.body;
  const pat = process.env.GITHUB_PAT;

  console.log(`Received request to fetch files for repo: ${repoUrl}`);

  if (!repoUrl) {
    console.error('Validation Error: Repository URL is required.');
    return res.status(400).json({ error: 'Repository URL is required.' });
  }
  if (!pat) {
    console.error('Configuration Error: GitHub PAT is not configured.');
    return res.status(400).json({ error: 'GitHub PAT is not configured on the server.' });
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);

    console.log(`Parsed owner: ${owner}, repo: ${repo}`);

    const octokit = new Octokit({ auth: pat });

    console.log('Fetching default branch...');
    const { data: repoInfo } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoInfo.default_branch;
    console.log(`Default branch: ${defaultBranch}`);

    console.log('Fetching branch reference...');
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const mainBranchSha = refData.object.sha;
    console.log(`Branch SHA: ${mainBranchSha}`);

    console.log('Fetching file tree...');
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: mainBranchSha,
      recursive: 1,
    });

    const files = treeData.tree.filter(node => node.type === 'blob').map(file => ({ path: file.path, sha: file.sha }));
    console.log(`Found ${files.length} files.`);
    res.json(files);

  } catch (error) {
    console.error('GitHub API Error in getRepoFiles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repository files from GitHub.',
      details: error.message 
    });
  }
};

export const getFileContent = async (req, res) => {
  const { repoUrl, filePath } = req.body;
  const pat = process.env.GITHUB_PAT;

  if (!repoUrl || !filePath) {
    return res.status(400).json({ error: 'Repository URL and file path are required.' });
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);
    const octokit = new Octokit({ auth: pat });

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    res.json({ content });

  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).json({ error: 'Failed to fetch file content.' });
  }
};

export const createPullRequest = async (req, res) => {
  const { repoUrl, code, filePath, branchName, commitMessage, prTitle, prBody } = req.body;
  const pat = process.env.GITHUB_PAT;

  if (!repoUrl || !code || !filePath || !branchName || !commitMessage || !prTitle) {
    return res.status(400).json({ error: 'Missing required parameters for creating a pull request.' });
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);
    const octokit = new Octokit({ auth: pat });

    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const baseBranch = repoData.default_branch;

    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    const baseSha = refData.object.sha;

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    const { data: blobData } = await octokit.git.createBlob({
      owner,
      repo,
      content: code,
      encoding: 'utf-8',
    });

    const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: baseSha,
    });
    const baseTreeSha = commitData.tree.sha;

    const { data: treeData } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: [
        {
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });

    const { data: newCommitData } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: treeData.sha,
      parents: [baseSha],
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: newCommitData.sha,
    });

    const { data: prData } = await octokit.pulls.create({
      owner,
      repo,
      title: prTitle,
      head: branchName,
      base: baseBranch,
      body: prBody,
    });

    res.status(201).json({ prUrl: prData.html_url });

  } catch (error) {
    console.error('Error creating pull request:', error);
    res.status(500).json({ error: 'Failed to create pull request.' });
  }
};


