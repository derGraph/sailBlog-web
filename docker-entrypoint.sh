#!/bin/sh
npx prisma db push --skip-generate
npx pm2-runtime start /ecosystem.config.js
