FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/artifacts/package.json packages/artifacts/package.json
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4100
CMD ["node", "apps/api/dist/server.js"]
