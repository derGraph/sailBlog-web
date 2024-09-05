#!/bin/sh
npx prisma db push --skip-generate
pm2 start /app/build/index.js
pm2 monit