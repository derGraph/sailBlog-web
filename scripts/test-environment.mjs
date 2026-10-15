export function assertTestEnvironment() {
  const url = new URL(process.env.DATABASE_URL ?? 'mysql://invalid');
  if (
    process.env.SAILBLOG_TEST_DATABASE !== '1' ||
    process.env.DATABASE_NAME !== 'sailblog_test' ||
    process.env.DATABASE_USER !== 'sailblog_test' ||
    process.env.DATABASE_HOST !== '127.0.0.1' ||
    url.protocol !== 'mysql:' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/sailblog_test' ||
    url.username !== 'sailblog_test' ||
    url.port !== process.env.DATABASE_PORT ||
    decodeURIComponent(url.password) !== process.env.DATABASE_PASSWORD ||
    !process.env.SAILBLOG_TEST_STORAGE
  ) {
    throw new Error(
      'Database tests must run through npm run test:integration, test:e2e, or test:all.'
    );
  }
}
