# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Build stage
FROM base AS build
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Build args for Vite
ARG PWA_ENABLED="true"
ARG GA_ID
ARG APP_DOMAIN
ARG OPENSEARCH_ENABLED="false"
ARG TMDB_READ_API_KEY
ARG CORS_PROXY_URL
ARG DMCA_EMAIL
ARG NORMAL_ROUTER="false"
ARG BACKEND_URL
ARG HAS_ONBOARDING="false"
ARG ONBOARDING_CHROME_EXTENSION_INSTALL_LINK
ARG ONBOARDING_PROXY_INSTALL_LINK
ARG DISALLOWED_IDS
ARG CDN_REPLACEMENTS
ARG TURNSTILE_KEY
ARG ALLOW_AUTOPLAY="false"

# Set build-time env vars for Vite
ENV VITE_PWA_ENABLED=${PWA_ENABLED} \
    VITE_GA_ID=${GA_ID} \
    VITE_APP_DOMAIN=${APP_DOMAIN} \
    VITE_OPENSEARCH_ENABLED=${OPENSEARCH_ENABLED} \
    VITE_TMDB_READ_API_KEY=${TMDB_READ_API_KEY} \
    VITE_CORS_PROXY_URL=${CORS_PROXY_URL} \
    VITE_DMCA_EMAIL=${DMCA_EMAIL} \
    VITE_NORMAL_ROUTER=${NORMAL_ROUTER} \
    VITE_BACKEND_URL=${BACKEND_URL} \
    VITE_HAS_ONBOARDING=${HAS_ONBOARDING} \
    VITE_ONBOARDING_CHROME_EXTENSION_INSTALL_LINK=${ONBOARDING_CHROME_EXTENSION_INSTALL_LINK} \
    VITE_ONBOARDING_PROXY_INSTALL_LINK=${ONBOARDING_PROXY_INSTALL_LINK} \
    VITE_DISALLOWED_IDS=${DISALLOWED_IDS} \
    VITE_CDN_REPLACEMENTS=${CDN_REPLACEMENTS} \
    VITE_TURNSTILE_KEY=${TURNSTILE_KEY} \
    VITE_ALLOW_AUTOPLAY=${ALLOW_AUTOPLAY}

# Copy source files
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:stable-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Optional: Copy custom nginx config if you have one
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]