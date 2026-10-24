import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'node:fs';

const token = process.env.GH_TOKEN;
if (!token) {
  console.error('GH_TOKEN environment variable not set');
  process.exit(1);
}

async function main() {
  console.log('Pushing to GitHub via isomorphic-git...');
  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: '.',
      remote: 'origin',
      ref: 'main',
      url: 'https://github.com/jakhotiasiya2008-maker/study-tracker-pwa.git',
      force: true,
      onAuth: () => ({ username: token }),
      onProgress: (p) => {
        console.log(`Progress: ${p.phase} - ${p.loaded}/${p.total || '?'}`);
      },
    });
    console.log('Push completed successfully!', pushResult);
  } catch (err) {
    console.error('Push error:', err);
    process.exit(1);
  }
}

main();
