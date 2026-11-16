FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
# mongodump, used by the worker's daily backup job (services/backup.ts)
ARG MONGO_TOOLS=https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian12-x86_64-100.10.0.deb
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
 && curl -fsSL "$MONGO_TOOLS" -o /tmp/tools.deb && apt-get install -y /tmp/tools.deb \
 && rm -rf /tmp/tools.deb /var/lib/apt/lists/* \
 && mkdir -p /app/backups && chown node:node /app/backups
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
