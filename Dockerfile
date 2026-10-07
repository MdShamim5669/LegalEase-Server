# Multi-stage production Dockerfile for LegalEase Backend
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# 1. Dependencies stage
FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN pnpm config set enable-pre-post-scripts true && pnpm install --frozen-lockfile

# 2. Build stage
FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma:generate
RUN pnpm build
# Ensure EJS email templates are copied into dist directory
RUN mkdir -p dist/app/templates && cp -r src/app/templates/* dist/app/templates/

# 3. Production runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/app/templates ./src/app/templates
COPY --from=builder /app/package.json ./package.json

USER nodejs

EXPOSE 5000

CMD ["node", "dist/server.js"]
