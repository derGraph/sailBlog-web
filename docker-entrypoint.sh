#!/bin/sh
npx prisma db push --skip-generate
npx pm2 start /app/build/index.js
