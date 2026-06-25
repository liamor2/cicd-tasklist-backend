FROM oven/bun:1.3.14-alpine AS build

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY prisma ./prisma
RUN bun run prisma:generate

COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1.3.5-alpine AS prod-deps

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production

FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN apk upgrade --no-cache \
	&& rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY package.json ./
COPY prisma ./prisma
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/server.js"]
