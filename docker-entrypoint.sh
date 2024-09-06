#!/bin/sh
npx prisma db push --skip-generate
npx pm2-runtime start /app/pm2.config.js
