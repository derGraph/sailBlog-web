import { handler } from './handler.js';
import polka from 'polka';
import compression from '@polka/compression';

let server = polka();

server.use(handler);
server.use(compression({
	gzip: true,
	brotli: true,
	threshold: 1024
}))

server.listen(3000, () => {
	console.log('listening on port 3000');
});