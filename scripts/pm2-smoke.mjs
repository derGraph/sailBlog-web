import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const directory = await mkdtemp(join(tmpdir(), 'sailblog-pm2-'));
process.env.PM2_HOME = join(directory, 'pm2');
const require = createRequire(import.meta.url);
const pm2Directory = dirname(require.resolve('pm2/package.json'));
const watcher = join(
  dirname(require.resolve('chokidar', { paths: [pm2Directory] })),
  'package.json'
);
assert.equal(require(watcher).version, '4.0.3');
assert.throws(() => require.resolve('braces', { paths: [pm2Directory] }), {
  code: 'MODULE_NOT_FOUND'
});
const pm2 = require('pm2');
const call = (method, ...args) =>
  new Promise((resolve, reject) => {
    pm2[method](...args, (error, result) => (error ? reject(error) : resolve(result)));
  });
async function until(check, description) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`PM2 smoke test timed out: ${description}`);
}
let connected = false;
try {
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  await mkdir(join(directory, 'watched'));
  const watched = join(directory, 'watched', 'version.txt');
  await writeFile(watched, 'initial');
  await writeFile(
    join(directory, 'web.cjs'),
    `require('node:http').createServer((req, res) => res.end(String(process.pid))).listen(${port}, '127.0.0.1');`
  );
  await writeFile(join(directory, 'worker.cjs'), 'setInterval(() => {}, 1000);');
  await call('connect');
  connected = true;
  await call('start', {
    name: 'web-test',
    script: join(directory, 'web.cjs'),
    exec_mode: 'cluster',
    instances: 4,
    watch: false,
    autorestart: true
  });
  await call('start', {
    name: 'worker-test',
    script: join(directory, 'worker.cjs'),
    watch: [join(directory, 'watched')],
    watch_delay: 50,
    autorestart: true
  });
  const processes = await until(async () => {
    const list = await call('list');
    return list.length === 5 && list.every((item) => item.pm2_env.status === 'online') && list;
  }, 'four clustered web processes and one worker');
  await until(async () => {
    try {
      return (await fetch(`http://127.0.0.1:${port}`)).ok;
    } catch {
      return false;
    }
  }, 'cluster HTTP startup');
  const victim = processes.find((item) => item.name === 'web-test');
  process.kill(victim.pid, 'SIGKILL');
  await until(
    async () =>
      (await call('list')).some(
        (item) =>
          item.pm_id === victim.pm_id && item.pid !== victim.pid && item.pm2_env.status === 'online'
      ),
    'cluster crash recovery'
  );
  const worker = (await call('list')).find((item) => item.name === 'worker-test');
  await delay(500);
  await writeFile(watched, 'changed');
  await until(
    async () =>
      (await call('list')).some(
        (item) =>
          item.name === 'worker-test' && item.pid !== worker.pid && item.pm2_env.status === 'online'
      ),
    'directory-triggered restart'
  );
  console.log('PM2 cluster startup, crash recovery, and directory watching OK; braces absent');
} finally {
  if (connected) {
    try {
      await call('delete', 'all');
    } finally {
      await call('killDaemon');
      pm2.disconnect();
    }
  }
  await rm(directory, { recursive: true, force: true });
}
// PM2 retains client timers after its daemon stops; cleanup has finished here.
process.exit(0);
