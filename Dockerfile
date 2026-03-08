# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: base — Node + pnpm
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: deps — install npm dependencies (no secrets, fully cacheable)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: builder — compile the Vite app
#
# Sensitive config (API keys, proxy URLs, …) is intentionally NOT passed here;
# it is injected at runtime via docker-entrypoint.sh → /config.js so that
# a single image can be shared / reused without baking secrets into layers.
#
# Only non-sensitive, build-behaviour flags are accepted as ARGs.
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Whether to enable the PWA service worker (default: false).
# Set to "true" when building the :pwa image variant.
ARG PWA_ENABLED="false"

# Optional non-secret build flags
ARG GA_ID=""
ARG APP_DOMAIN=""
ARG OPENSEARCH_ENABLED="false"

ENV VITE_PWA_ENABLED=${PWA_ENABLED}
ENV VITE_GA_ID=${GA_ID}
ENV VITE_APP_DOMAIN=${APP_DOMAIN}
ENV VITE_OPENSEARCH_ENABLED=${OPENSEARCH_ENABLED}

COPY . .

# Run the appropriate build command based on PWA_ENABLED
RUN if [ "$PWA_ENABLED" = "true" ]; then \
      pnpm run build:pwa; \
    else \
      pnpm run build; \
    fi

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: runner — nginx serves the static assets
#
# Runtime configuration is injected by docker-entrypoint.sh which writes
# /usr/share/nginx/html/config.js from environment variables before nginx
# starts. Pass any VITE_* variable as a -e flag to `docker run` or in your
# compose file; no rebuild is required.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]