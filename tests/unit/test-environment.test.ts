import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertTestEnvironment } from '../../scripts/test-environment.mjs';

const environment = {
  SAILBLOG_TEST_DATABASE: '1',
  SAILBLOG_TEST_STORAGE: '/tmp/sailblog-tests-guard',
  DATABASE_NAME: 'sailblog_test',
  DATABASE_USER: 'sailblog_test',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '3307',
  DATABASE_PASSWORD: 'temporary',
  DATABASE_URL: 'mysql://sailblog_test:temporary@127.0.0.1:3307/sailblog_test'
};
afterEach(() => vi.unstubAllEnvs());
describe('test database isolation guard', () => {
  it('accepts a matching disposable database configuration', () => {
    for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
    expect(assertTestEnvironment).not.toThrow();
  });
  it.each([
    ['SAILBLOG_TEST_DATABASE', '0'],
    ['SAILBLOG_TEST_STORAGE', ''],
    ['DATABASE_NAME', 'production'],
    ['DATABASE_USER', 'root'],
    ['DATABASE_HOST', 'production.example'],
    ['DATABASE_PORT', '3306'],
    ['DATABASE_PASSWORD', 'different'],
    ['DATABASE_URL', 'mysql://sailblog_test:temporary@127.0.0.1:3307/production'],
    ['DATABASE_URL', 'postgres://sailblog_test:temporary@127.0.0.1:3307/sailblog_test']
  ])('refuses an unsafe or mismatched %s', (key, value) => {
    for (const [name, setting] of Object.entries(environment)) vi.stubEnv(name, setting);
    vi.stubEnv(key, value);
    expect(assertTestEnvironment).toThrow(/Database tests must run/);
  });
});
