import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const image = `sailblog-test:${randomUUID().slice(0, 8)}`;
const container = `sailblog-runtime-${randomUUID().slice(0, 8)}`;
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
let started = false;
await mkdir('test-results', { recursive: true });
try {
  console.log('Building the production Docker image...');
  const build = spawnSync('docker', ['build', '--tag', image, '.'], {
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 20 * 1024 * 1024
  });
  const output = `${build.stdout ?? ''}${build.stderr ?? ''}`;
  await writeFile('test-results/docker-build.log', output);
  if (build.error) throw build.error;
  if (build.status !== 0)
    throw new Error(
      `Docker build failed. See test-results/docker-build.log.\n${output.slice(-4000)}`
    );
  const smoke = `import sharp from 'sharp'; import DOMPurify from 'isomorphic-dompurify';
    await import('./workers/workers/prisma.js'); await import('./workers/workers/calculateUser.js');
    await import('./workers/workers/simplifyGps.js'); await import('./workers/workers/locateImages.js');
    const image = await sharp({create:{width:4,height:4,channels:3,background:'white'}}).avif().toBuffer();
    if (!image.length || DOMPurify.sanitize('<script>x</script><p>safe</p>') !== '<p>safe</p>') throw Error('Runtime smoke failed');
    console.log('Image, sanitization and compiled worker runtime OK');`;
  console.log(
    docker('run', '--rm', '--entrypoint', 'node', image, '--input-type=module', '-e', smoke)
  );
  console.log(docker('run', '--rm', '--entrypoint', 'npx', image, 'prisma', 'validate'));
  // Bypass the deployment entrypoint: this check never pushes a database schema.
  docker(
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--publish',
    '127.0.0.1::3000',
    '--entrypoint',
    'node',
    image,
    'build/index.js'
  );
  started = true;
  const port = JSON.parse(
    docker('inspect', '--format', '{{json .NetworkSettings.Ports}}', container)
  )['3000/tcp'][0].HostPort;
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      if ((await fetch(`${origin}/terms`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(1000);
  }
  assert(ready, 'Production container did not start');
  for (const route of ['/terms', '/privacy', '/sign_in', '/sign_up']) {
    assert.equal((await fetch(origin + route)).status, 200, route);
  }
  console.log('Production container HTTP startup OK');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (started) {
    await writeFile('test-results/docker-runtime.log', docker('logs', container));
    docker('rm', '--force', container);
  }
  try {
    docker('image', 'rm', image);
  } catch {}
}
