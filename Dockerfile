FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json .
#TODO: remove legacy peer drops as soon as the adapter is updated!
RUN npm i --force
COPY . .
RUN npx prisma generate
RUN npx tsc -p workers/tsconfig.json
RUN npm run build
RUN npm prune --production --force

FROM node:23-alpine3.20
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/workers/build/workers /app/workers/
COPY prisma /app/prisma/
COPY docker-entrypoint.sh /
COPY package.json .
COPY ecosystem.config.js /
EXPOSE 3000
ENV NODE_ENV=production

COPY index.js /app/build/index.js

ENTRYPOINT ["/docker-entrypoint.sh"]
RUN ["chmod", "+x", "/docker-entrypoint.sh"]
