FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm i
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY prisma /app/prisma/
COPY entrypoint.sh /app/entrypoint.sh
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["entrypoint.sh"]