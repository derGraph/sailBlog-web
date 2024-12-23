FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm i
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

WORKDIR /app/workers
RUN npm i
RUN npx tsc
RUN npx tsc-alias

FROM node:22-alpine
WORKDIR /app
RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/workers/build /app/workers
COPY prisma /app/prisma/
COPY docker-entrypoint.sh /
COPY package.json .
COPY ecosystem.config.js /
EXPOSE 3000
ENV NODE_ENV=production

COPY index.js /app/build/index.js

ENTRYPOINT ["/docker-entrypoint.sh"]
RUN ["chmod", "+x", "/docker-entrypoint.sh"]