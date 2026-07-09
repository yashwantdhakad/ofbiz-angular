import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const appRoot = resolve('src/app');
const angularCliEntry = resolve('node_modules/@angular/cli/bin/ng.js');
const startIndex = Number.parseInt(process.argv[2] ?? '0', 10);
const endIndexArg = process.argv[3];
const endIndex = endIndexArg ? Number.parseInt(endIndexArg, 10) : Number.POSITIVE_INFINITY;

function collectSpecFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectSpecFiles(fullPath);
      }
      return entry.name.endsWith('.spec.ts') ? [fullPath] : [];
    });
}

const specFiles = collectSpecFiles(appRoot)
  .map((file) => relative(resolve('src'), file).replace(/\\/g, '/'))
  .sort();

const shardFiles = specFiles.slice(startIndex, Number.isFinite(endIndex) ? endIndex : undefined);

if (!shardFiles.length) {
  console.error(`No spec files found for shard range ${startIndex}..${endIndexArg ?? 'end'}.`);
  process.exit(1);
}

const ngArgs = [
  angularCliEntry,
  'test',
  '--watch=false',
  '--karma-config',
  'karma.codex.conf.js',
  '--source-map=false',
  ...shardFiles.flatMap((file) => ['--include', file]),
];

const result = spawnSync(process.execPath, ngArgs, {
  stdio: 'inherit',
  cwd: resolve('.'),
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
