FROM node:24-alpine AS builder
WORKDIR /app
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
COPY package.json .
#TODO: remove legacy peer drops as soon as the adapter is updated!
RUN npm i --force
COPY . .
RUN npx prisma generate
RUN npx run build-workers
RUN npm run build
RUN npm prune --production --force

FROM node:24-alpine3.20
WORKDIR /app
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/workers/build /app/workers/
COPY prisma /app/prisma/
COPY docker-entrypoint.sh /
COPY package.json .
COPY ecosystem.config.js /
EXPOSE 3000
ENV NODE_ENV=production

COPY index.js /app/build/index.js

ENTRYPOINT ["/docker-entrypoint.sh"]
RUN ["chmod", "+x", "/docker-entrypoint.sh"]
