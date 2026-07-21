# ---- Build stage: produce the static site ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_BASE can be overridden at build time; defaults to same-origin /api.
ARG VITE_API_BASE
RUN npm run build

# ---- Serve stage: Caddy serves the static site + proxies /api to the backend ----
FROM caddy:2-alpine AS serve
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
