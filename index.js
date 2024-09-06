import { handler } from './handler.js';
import express from 'express';
import compression from 'compression';

let server = express();
server.use(compression({
	gzip: true,
	threshold: 5120
}));
server.use(handler);


server.listen(3000, () => {
	console.log('listening on port 3000');
});