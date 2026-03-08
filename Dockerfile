# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: base — Node 24 LTS + pnpm via corepack
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: deps — install npm dependencies
#   • BuildKit cache mount keeps the pnpm content-addressable store between
#     builds so that only changed packages are re-downloaded.
#   • No secrets or config values here — fully cacheable and shareable.
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: builder — compile the Vite SPA
#
# Sensitive runtime config (API keys, proxy URLs, …) is intentionally NOT
# passed here.  It is injected at container-start time by docker-entrypoint.sh
# which overwrites /usr/share/nginx/html/config.js from env vars / Docker
# secrets — so a single image works for every deployment without a rebuild.
#
# Only non-sensitive, build-behaviour flags belong as ARGs.
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Whether to enable the PWA service worker (produces the :pwa image variant).
ARG PWA_ENABLED="false"

# Optional non-secret build-time flags
ARG GA_ID=""
ARG APP_DOMAIN=""
ARG OPENSEARCH_ENABLED="false"

ENV VITE_PWA_ENABLED=${PWA_ENABLED}
ENV VITE_GA_ID=${GA_ID}
ENV VITE_APP_DOMAIN=${APP_DOMAIN}
ENV VITE_OPENSEARCH_ENABLED=${OPENSEARCH_ENABLED}

COPY . .

RUN if [ "$PWA_ENABLED" = "true" ]; then \
      pnpm run build:pwa; \
    else \
      pnpm run build; \
    fi

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: runner — nginx:stable-alpine serves the static assets
#
# • nginx:stable-alpine tracks the current stable release and picks up
#   security patches automatically on rebuild.
# • The nginx process is kept as the nginx user (non-root) via the config.
# • Runtime config is written by docker-entrypoint.sh from env vars / secrets.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS runner

# Remove the default site config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# nginx:stable-alpine exposes 80; drop all other capabilities
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
