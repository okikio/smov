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

# Runtime builder stage - builds and serves with nginx
FROM nginx:stable-alpine AS production

# Install Node.js and pnpm in the nginx image for runtime builds
RUN apk add --no-cache nodejs npm && \
    corepack enable && \
    corepack prepare pnpm@latest --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY package.json pnpm-lock.yaml ./
COPY . .

EXPOSE 80

# Build the app at runtime with env vars, then start nginx
# The build output goes to /app/dist which we'll copy to nginx's html directory
CMD pnpm run build && \
    cp -r /app/dist/* /usr/share/nginx/html/ && \
    nginx -g 'daemon off;'