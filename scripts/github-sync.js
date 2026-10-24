import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.GH_TOKEN;
const OWNER = 'jakhotiasiya2008-maker';
const REPO = 'study-tracker-pwa';
const BRANCH = 'main';

if (!TOKEN) {
  console.error('GH_TOKEN is required');
  process.exit(1);
}

const headers = {
  'User-Agent': 'NodeJS-GitHub-Sync',
  'Authorization': `token ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

async function ghFetch(endpoint, options = {}) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API error ${res.status} on ${endpoint}: ${errorText}`);
  }
  return res.json();
}

function getAllFiles(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const relPath = path.join(baseDir, file).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

async function main() {
  console.log(`Starting push of all files to https://github.com/${OWNER}/${REPO}...`);

  // 1. Get latest commit SHA on main (if exists)
  let parentCommitSha = null;
  try {
    const refData = await ghFetch(`/git/ref/heads/${BRANCH}`);
    parentCommitSha = refData.object.sha;
    console.log(`Current branch head on ${BRANCH}: ${parentCommitSha}`);
  } catch (err) {
    console.log(`Branch ${BRANCH} does not exist yet or empty repository.`);
  }

  // 2. Read all files in workspace
  const files = getAllFiles('.');
  console.log(`Uploading ${files.length} files as blobs...`);

  const treeEntries = [];

  // Upload in batches of 5 to avoid rate issues
  for (let i = 0; i < files.length; i += 5) {
    const batch = files.slice(i, i + 5);
    const promises = batch.map(async ({ fullPath, relPath }) => {
      const content = fs.readFileSync(fullPath);
      const base64Content = content.toString('base64');
      const blob = await ghFetch('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({
          content: base64Content,
          encoding: 'base64',
        }),
      });
      return {
        path: relPath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      };
    });
    const results = await Promise.all(promises);
    treeEntries.push(...results);
    process.stdout.write(`Uploaded ${treeEntries.length}/${files.length} files...\r`);
  }
  console.log(`\nAll ${treeEntries.length} files uploaded as blobs!`);

  // 3. Create tree
  console.log('Creating Git Tree...');
  const tree = await ghFetch('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      tree: treeEntries,
    }),
  });
  console.log(`Tree created with SHA: ${tree.sha}`);

  // 4. Create commit
  console.log('Creating commit...');
  const commit = await ghFetch('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: 'feat: StudyFlow Production PWA complete with tests and verification',
      tree: tree.sha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    }),
  });
  console.log(`Commit created with SHA: ${commit.sha}`);

  // 5. Update reference or create branch if needed
  console.log(`Updating ref refs/heads/${BRANCH}...`);
  if (parentCommitSha) {
    await ghFetch(`/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: commit.sha,
        force: true,
      }),
    });
  } else {
    await ghFetch('/git/refs', {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${BRANCH}`,
        sha: commit.sha,
      }),
    });
  }

  console.log(`\n🎉 SUCCESS! All code pushed to: https://github.com/${OWNER}/${REPO}/tree/${BRANCH}`);
}

main().catch((e) => {
  console.error('\nSync failed:', e);
  process.exit(1);
});
