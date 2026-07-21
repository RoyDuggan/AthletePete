# Debian-slim (not Alpine): Prisma's engines need OpenSSL/libssl, which Alpine
# lacks out of the box.

# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install deps (including dev) for the build.
COPY package*.json ./
RUN npm ci

# Generate Prisma client + compile TypeScript.
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Production deps only, then bring in the generated client + compiled output.
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist

# Telemetry uploads live on a mounted volume.
RUN mkdir -p /app/uploads /app/data
EXPOSE 3001

# Apply migrations, then start the compiled server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
