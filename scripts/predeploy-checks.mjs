#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(process.cwd());

const runCheck = ({ cmd, args, cwd }) =>
  spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

const checks = [
  {
    name: 'Git working tree clean',
    run: () => {
      const tracked = runCheck({
        cmd: 'git',
        args: ['diff', '--quiet'],
        cwd: root,
      });
      const staged = runCheck({
        cmd: 'git',
        args: ['diff', '--cached', '--quiet'],
        cwd: root,
      });
      const untracked = runCheck({
        cmd: 'git',
        args: ['ls-files', '--others', '--exclude-standard'],
        cwd: root,
      });

      const hasTrackedChanges = tracked.status !== 0 || staged.status !== 0;
      const untrackedFiles = (untracked.stdout || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (hasTrackedChanges || untrackedFiles.length > 0) {
        console.error('Working tree must be clean before pre-deploy checks.');
        if (hasTrackedChanges) {
          console.error('- Tracked changes detected.');
        }
        if (untrackedFiles.length > 0) {
          console.error('- Untracked files detected:');
          for (const file of untrackedFiles) {
            console.error(`  - ${file}`);
          }
        }
        return { status: 1 };
      }

      console.log('Working tree clean (tracked + untracked).');
      return { status: 0 };
    },
  },
  {
    name: 'API type-check',
    cmd: 'npm',
    args: ['run', 'type-check'],
    cwd: resolve(root, 'apps/api'),
  },
  {
    name: 'API build',
    cmd: 'npm',
    args: ['run', 'build'],
    cwd: resolve(root, 'apps/api'),
  },
  {
    name: 'Web type-check',
    cmd: 'npm',
    args: ['run', 'type-check'],
    cwd: resolve(root, 'apps/web'),
  },
  {
    name: 'Web smoke (build + route chunks)',
    cmd: 'npm',
    args: ['run', 'smoke'],
    cwd: resolve(root, 'apps/web'),
  },
  {
    name: 'Web preview route reachability',
    cmd: 'npm',
    args: ['run', 'smoke:preview-routes'],
    cwd: resolve(root, 'apps/web'),
  },
];

console.log('🚀 Mission Control V2.0 Pre-Deployment Checks\n');

const results = [];
for (const check of checks) {
  console.log(`▶ ${check.name}`);
  const run =
    typeof check.run === 'function'
      ? check.run()
      : spawnSync(check.cmd, check.args, {
          cwd: check.cwd,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });

  const ok = run.status === 0;
  results.push({ name: check.name, ok });
  console.log(ok ? `✅ ${check.name} passed\n` : `❌ ${check.name} failed\n`);

  if (!ok) break;
}

console.log('—'.repeat(56));
console.log('Pre-Deployment Summary');
for (const result of results) {
  console.log(`${result.ok ? '✅' : '❌'} ${result.name}`);
}

const failed = results.find((r) => !r.ok);
if (failed) {
  console.error(`\nDeployment checks halted at: ${failed.name}`);
  process.exit(1);
}

console.log('\nAll pre-deployment checks passed. Ready for deployment prep.');
