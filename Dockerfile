# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install ALL dependencies (including devDependencies for build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Production stage - just use Node to serve with a simple server
FROM base AS production

# Install a simple static file server
RUN pnpm add -g serve

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY package.json pnpm-lock.yaml ./
COPY . .

EXPOSE 80

# Build at runtime then serve with 'serve' on port 80
CMD pnpm run build && serve -s dist -l 80