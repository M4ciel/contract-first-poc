# syntax=docker/dockerfile:1
# Library backend image. Built from the repository root (compose.yaml sets the context):
# the build generates code from the contracts, builds the workspace packages the app depends on,
# then `pnpm deploy` copies the app with only its production dependencies.

FROM node:24.22.2-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8 AS build
WORKDIR /repo
# pnpm comes from `packageManager` in package.json, through corepack.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NX_DAEMON=false NX_NO_CLOUD=true
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm nx run @acme/api:build
RUN pnpm --filter @acme/api deploy --prod /out

FROM node:24.22.2-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD node -e "fetch('http://127.0.0.1:3000/v1/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/main.js"]
