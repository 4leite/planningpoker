FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache pnpm

ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000 \
    REDIS_URL=redis://127.0.0.1:6379 \
    SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 \
    SKIP_SIMPLE_GIT_HOOKS=1

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY vite.config.ts tsconfig.json .
COPY src/ ./src/
# Nitro build generates the .output directory
RUN pnpm build

# --- Stage 2: Final Runner ---
FROM docker.io/library/redis:8-alpine AS runner

# Nitro needs Node.js to run the generated server
RUN apk add --no-cache nodejs

WORKDIR /app

ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000 \
    REDIS_URL=redis://127.0.0.1:6379

# Nitro's standalone output contains everything needed to run
COPY --from=builder /app/.output ./.output

# Copy your script to manage Redis + Node
COPY scripts/start-container.sh /usr/local/bin/start-container.sh
RUN chmod +x /usr/local/bin/start-container.sh

EXPOSE 3000

# Typically: node .output/server/index.mjs
ENTRYPOINT ["/usr/local/bin/start-container.sh"]

