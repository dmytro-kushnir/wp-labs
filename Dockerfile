# syntax=docker/dockerfile:1
# Образи застосунку (практичне завдання № 6). Параметр APP – каталог застосунку: app (студент) або demo (зразок).
#   docker compose up --build                       – застосунок студента
#   APP=demo docker compose -p wp-demo up --build   – демонстраційний застосунок
ARG APP=app

# ---- залежності для збирання (усі, разом із Vite і TypeScript)
FROM node:24-alpine AS deps
WORKDIR /src
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ---- збирання клієнта React
FROM deps AS client-build
ARG APP
COPY . .
RUN npx vite build --config ${APP}/client/vite.config.ts

# ---- сервер API: лише залежності для виконання, без прав root
FROM node:24-alpine AS api
ARG APP
ENV NODE_ENV=production APP=${APP} PORT=3000 HOST=0.0.0.0 DB_PATH=/data/catalog.db
WORKDIR /srv
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY contract ./contract
COPY ${APP}/src ./${APP}/src
COPY ${APP}/data ./${APP}/data
COPY ${APP}/server/src ./${APP}/server/src
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["sh", "-c", "exec node $APP/server/src/server.ts"]

# ---- вебсервер: статичні файли клієнта і зворотний проксі /api → api:3000
FROM nginx:stable-alpine AS web
ARG APP
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /src/${APP}/client/dist /usr/share/nginx/html
