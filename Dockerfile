# ==============================================================================
# CMADMS Production Multi-Stage Dockerfile
# Stage 1: Dependencies (reproducible npm ci)
# Stage 2: Builder (compiles TanStack Start / Vite production bundle into .output)
# Stage 3: Runner (lightweight Alpine runtime with non-dev dependencies)
# ==============================================================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Install all dependencies required for building the application
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy compiled Nitro server and Vite static assets
COPY --from=builder /app/.output ./.output

EXPOSE 3000

# Container healthcheck targeting the lightweight /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health || exit 1

CMD ["node", ".output/server/index.mjs"]
