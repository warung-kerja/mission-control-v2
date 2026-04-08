#!/usr/bin/env node
import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const port = Number(process.env.PREVIEW_PORT || 4173);
const baseUrl = `http://${host}:${port}`;
const timeoutMs = 20_000;

const routes = [
  '/',
  '/projects',
  '/tasks',
  '/calendar',
  '/team',
  '/office',
  '/memories',
  '/collaboration',
  '/analytics',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async () => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl, { redirect: 'manual' });
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await sleep(300);
  }
  throw new Error(`Preview server did not become ready within ${timeoutMs}ms`);
};

const checkRoute = async (path) => {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, { redirect: 'manual' });
  if (!res.ok) {
    throw new Error(`${path} returned HTTP ${res.status}`);
  }

  const html = await res.text();
  if (!html.includes('id="root"')) {
    throw new Error(`${path} response is missing app root container`);
  }
};

const preview = spawn('npm', ['run', 'preview', '--', '--host', host, '--port', String(port), '--strictPort'], {
  stdio: 'pipe',
  env: process.env,
  shell: process.platform === 'win32',
});

preview.stdout.on('data', (chunk) => process.stdout.write(chunk));
preview.stderr.on('data', (chunk) => process.stderr.write(chunk));

let exitCode = 0;

try {
  console.log('🌐 Verifying preview route reachability...');
  await waitForServer();

  for (const route of routes) {
    await checkRoute(route);
    console.log(`✅ ${route}`);
  }

  console.log(`\nPreview route check passed: ${routes.length}/${routes.length} routes reachable.`);
} catch (error) {
  exitCode = 1;
  console.error(`\n❌ Preview route check failed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  preview.kill('SIGTERM');
  await new Promise((resolve) => preview.on('exit', resolve));
}

process.exit(exitCode);
