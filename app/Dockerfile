# App de Distinto en el VPS de Hostinger (KVM 4). Pedro 09-oct-2026: Vercel
# Hobby pausó el proyecto por límite de CPU → la app corre aquí con Docker.
# La configuración secreta llega como secreto de BuildKit (no queda en la imagen).
FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS build
ARG APP_BUILD_ID=dev
ENV APP_BUILD_ID=$APP_BUILD_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Compilación acotada para este VPS compartido; el runtime conserva su configuración.
RUN --mount=type=secret,id=appenv,target=/app/.env.production \
    DISTINTO_VPS_BUILD=1 NODE_OPTIONS=--max-old-space-size=1024 npm run build -- --webpack

FROM base AS run
# Chromium del sistema para la grilla (PNG) y los PDF de propuestas.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-liberation fonts-noto-color-emoji fonts-noto-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ARG APP_BUILD_ID=dev
ENV NODE_ENV=production APP_BUILD_ID=$APP_BUILD_ID PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
