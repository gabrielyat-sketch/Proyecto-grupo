-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR', 'DIRECTOR', 'MEDICO', 'ENFERMERIA', 'FARMACIA', 'RECEPCION');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "usuario" VARCHAR(60) NOT NULL,
    "nombres" VARCHAR(120) NOT NULL,
    "apellidos" VARCHAR(120) NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "debe_cambiar_contrasena" BOOLEAN NOT NULL DEFAULT true,
    "bloqueado_hasta" TIMESTAMP(3),
    "ultimo_acceso" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_mfa" (
    "usuario_id" TEXT NOT NULL,
    "secreto_cifrado" BYTEA NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "activado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_mfa_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "codigo_respaldo" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "usado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigo_respaldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion_refresh" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocada_en" TIMESTAMP(3),
    "motivo_revocacion" VARCHAR(60),
    "ip" VARCHAR(45),
    "agente" VARCHAR(255),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesion_refresh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intento_fallido" (
    "id" BIGSERIAL NOT NULL,
    "usuario" VARCHAR(60) NOT NULL,
    "ip" VARCHAR(45),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intento_fallido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_usuario_key" ON "usuario"("usuario");

-- CreateIndex
CREATE INDEX "usuario_activo_idx" ON "usuario"("activo");

-- CreateIndex
CREATE INDEX "codigo_respaldo_usuario_id_idx" ON "codigo_respaldo"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_refresh_token_hash_key" ON "sesion_refresh"("token_hash");

-- CreateIndex
CREATE INDEX "sesion_refresh_usuario_id_idx" ON "sesion_refresh"("usuario_id");

-- CreateIndex
CREATE INDEX "sesion_refresh_familia_idx" ON "sesion_refresh"("familia");

-- CreateIndex
CREATE INDEX "sesion_refresh_expira_en_idx" ON "sesion_refresh"("expira_en");

-- CreateIndex
CREATE INDEX "intento_fallido_usuario_fecha_idx" ON "intento_fallido"("usuario", "fecha");

-- AddForeignKey
ALTER TABLE "configuracion_mfa" ADD CONSTRAINT "configuracion_mfa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_respaldo" ADD CONSTRAINT "codigo_respaldo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_refresh" ADD CONSTRAINT "sesion_refresh_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
