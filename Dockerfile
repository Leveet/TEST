FROM node:22-alpine AS build
RUN apk --timeout 20 add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --maxsockets=5 --fetch-timeout=60000
COPY . .
RUN npm run build

FROM build AS init
USER node
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed"]

FROM build AS production-deps
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist/src ./dist/src
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
