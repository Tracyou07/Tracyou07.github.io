import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';

const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
// Keep existing project and legacy URLs alongside the new homepage export.
for (const directory of ['regimevggt', '网页']) {
  cpSync(directory, `out/${directory}`, { recursive: true });
}
mkdirSync('out/legacy', { recursive: true });
cpSync('index.html', 'out/legacy/index.html');
writeFileSync('out/.nojekyll', '');
