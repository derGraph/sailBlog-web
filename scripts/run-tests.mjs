import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { assertTestEnvironment } from './test-environment.mjs';

const mode = process.argv[2] ?? 'all';
if (!['all', 'integration', 'e2e'].includes(mode)) throw new Error(`Unknown test suite: ${mode}`);
const container = `sailblog-tests-${randomUUID().slice(0, 8)}`;
const storage = await mkdtemp(join(tmpdir(), 'sailblog-tests-'));
const password = randomUUID();
let activeChild;
let started = false;
let stopping = false;

function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf8' }).trim();
}
async function run(command, args) {
  activeChild = spawn(command, args, { stdio: 'inherit', env: process.env });
  const code = await new Promise((resolve, reject) => {
    activeChild.on('error', reject);
    activeChild.on('exit', (code, signal) => resolve(signal ? 1 : code));
  });
  activeChild = undefined;
  if (code !== 0) throw new Error(`${command} ${args.join(' ')} failed (${code}).`);
}
async function cleanup() {
  if (started) {
    docker('rm', '--force', container);
    started = false;
  }
  await rm(storage, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    activeChild?.kill(signal);
    await cleanup();
    process.exit(130);
  });
}
try {
  if (mode === 'all') await run('npm', ['test']);
  console.log('Starting disposable MariaDB test database...');
  docker(
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--publish',
    '127.0.0.1::3306',
    '--env',
    `MARIADB_ROOT_PASSWORD=${password}`,
    '--env',
    'MARIADB_DATABASE=sailblog_test',
    '--env',
    'MARIADB_USER=sailblog_test',
    '--env',
    `MARIADB_PASSWORD=${password}`,
    '--health-cmd',
    'healthcheck.sh --connect --innodb_initialized',
    '--health-interval',
    '1s',
    '--health-timeout',
    '5s',
    '--health-retries',
    '60',
    'mariadb:11.8'
  );
  started = true;
  let healthy = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    if (docker('inspect', '--format', '{{.State.Health.Status}}', container) === 'healthy') {
      healthy = true;
      break;
    }
    await delay(1000);
  }
  if (!healthy) {
    console.error(docker('logs', container));
    throw new Error('Test MariaDB did not become healthy.');
  }
  const port = JSON.parse(
    docker('inspect', '--format', '{{json .NetworkSettings.Ports}}', container)
  )['3306/tcp'][0].HostPort;
  Object.assign(process.env, {
    SAILBLOG_TEST_DATABASE: '1',
    SAILBLOG_TEST_STORAGE: storage,
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: port,
    DATABASE_USER: 'sailblog_test',
    DATABASE_PASSWORD: password,
    DATABASE_NAME: 'sailblog_test',
    DATABASE_URL: `mysql://sailblog_test:${password}@127.0.0.1:${port}/sailblog_test`,
    IS_DEVELOPMENT: '1'
  });
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  process.env.SAILBLOG_TEST_PORT = String(listener.address().port);
  await new Promise((resolve) => listener.close(resolve));
  assertTestEnvironment();
  await run('npm', ['run', 'generate']);
  await run('npx', ['prisma', 'validate']);
  await run('npx', ['prisma', 'db', 'push']);
  await run('npm', ['run', 'check']);
  await run('npm', ['run', 'check:tests']);
  await run('npm', ['run', 'build-workers']);
  await run('npm', ['run', 'build']);
  if (mode !== 'e2e') {
    await run('npx', ['vitest', 'run', '--config', 'vitest.integration.config.ts']);
    await run('npx', ['playwright', 'test', '--project=api']);
  }
  if (mode !== 'integration') {
    await run('npx', ['playwright', 'test', '--project=desktop', '--project=mobile']);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
