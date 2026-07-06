#!/bin/sh
npx prisma generate
npx prisma db push
npx pm2-runtime start /ecosystem.config.js
