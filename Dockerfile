FROM node:26-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./

RUN npm ci --force
COPY . .
RUN npx prisma generate
RUN npm run build-workers
RUN npm run build
RUN npm prune --production --force

FROM node:26-alpine3.23
WORKDIR /app

# Ensure correct permissions for your entrypoint early on
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/workers/build /app/workers/
COPY --from=builder /app/prisma.config.ts /app
COPY prisma /app/prisma/
COPY package.json .
COPY ecosystem.config.js /
COPY index.js /app/build/index.js

EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["/docker-entrypoint.sh"]
