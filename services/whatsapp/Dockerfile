# services/whatsapp/Dockerfile
# Single-stage Node 22 alpine. Baileys necesita ffmpeg solo si enviamos audio/video
# (no es el caso — solo imágenes y texto), así que skip de eso.

FROM node:22-alpine

# git: alguna dep de @whiskeysockets/baileys usa git+ URL en su árbol
# (postinstall de libsignal o similar). Sin esto, npm install falla con ENOENT.
# Otras tools opcionales: bash y wget (para HEALTHCHECK abajo).
RUN apk add --no-cache git python3 make g++ wget

WORKDIR /app

# Layer caching: deps primero
COPY package.json ./
RUN npm install --omit=optional --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

# Koyeb monta el persistent volume en /data — aseguramos que existe
RUN mkdir -p /data/auth

ENV NODE_ENV=production \
    AUTH_DIR=/data/auth \
    PORT=8000 \
    LOG_LEVEL=info

EXPOSE 8000

# Healthcheck para Koyeb — usa el endpoint público /healthz
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://localhost:8000/healthz || exit 1

CMD ["npm", "start"]
