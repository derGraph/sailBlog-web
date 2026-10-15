import express from 'express';
import compression from 'compression';
import { assertTestEnvironment } from './test-environment.mjs';

assertTestEnvironment();
process.chdir(process.env.SAILBLOG_TEST_STORAGE);
process.env.PROTOCOL_HEADER = 'x-sailblog-test-protocol';
const { handler } = await import('../build/handler.js');
const app = express();
app.use((request, response, next) => {
  request.headers['x-sailblog-test-protocol'] = 'http';
  next();
});
app.use(compression({ threshold: 5120 }));
app.use(handler);
const server = app.listen(Number(process.env.SAILBLOG_TEST_PORT ?? 4173), '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.closeAllConnections();
    server.close(() => process.exit(0));
  });
}
