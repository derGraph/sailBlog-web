#!/bin/sh
npx prisma db push --skip-generate
node build