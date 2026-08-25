# Imagen multi-etapa. Se construye desde la RAIZ del monorepo:
#   docker build -f services/_plantilla/Dockerfile -t cap/plantilla .
#
# El contexto es la raiz porque el servicio depende del workspace @cap/shared.

# ─── etapa 1: dependencias y compilacion ──────────────────────────────────
FROM node:22-alpine AS constructor
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY services/_plantilla/package.json services/_plantilla/
RUN npm ci

COPY packages/shared packages/shared
COPY services/_plantilla services/_plantilla

RUN npm run build -w @cap/shared \
 && npx prisma generate --schema services/_plantilla/prisma/schema.prisma \
 && npm run build -w @cap/plantilla

# ─── etapa 2: solo lo necesario para ejecutar ─────────────────────────────
FROM node:22-alpine AS ejecucion
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY services/_plantilla/package.json services/_plantilla/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=constructor /app/packages/shared/dist packages/shared/dist
COPY --from=constructor /app/services/_plantilla/dist services/_plantilla/dist
COPY --from=constructor /app/node_modules/.prisma node_modules/.prisma

# No se ejecuta como root: si alguien logra ejecucion remota de codigo,
# encuentra un usuario sin privilegios, no el dueno del contenedor.
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PUERTO||3000)+'/v1/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "services/_plantilla/dist/main.js"]
