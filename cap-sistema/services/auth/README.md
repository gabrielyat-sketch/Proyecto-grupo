# auth — Servicio de Usuarios y Acceso

**Puerto:** 3001 · **Requerimientos:** RF-06

## Responsabilidad

Cuentas, roles, permisos, JWT, refresh, MFA TOTP, bloqueo por intentos

## Origen

Se genera copiando `services/_plantilla`. No se escribe desde cero.

## Base de datos

Esquema `auth`, usuario `cap_auth`. **Ningún otro servicio accede a este esquema.**

## Todos los demás servicios dependen de este

Por eso se construye primero (Etapa 3).

## Defensa en profundidad

El gateway valida el JWT, **y cada microservicio lo vuelve a validar** con el guard de `@cap/shared`.
Si un atacante alcanza la red interna, saltarse Nginx no le sirve de nada.

## Reglas

- Contraseñas con **Argon2id**, nunca cifrado reversible.
- MFA por **TOTP obligatorio** para Administrador y Director. No por SMS: la cobertura móvil en el
  área no es confiable.
- Access token de 15 minutos; refresh token rotatorio en cookie HttpOnly.
- Cierre de sesión por inactividad: las computadoras del CAP se comparten entre turnos.
- Códigos de respaldo de un solo uso, entregados en sobre cerrado al director del CAP.

## Estado

Pendiente. Ver el orden de construcción en §14 de la arquitectura.
