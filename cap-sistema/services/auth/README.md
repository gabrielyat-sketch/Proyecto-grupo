# auth — Servicio de Usuarios y Acceso

**Puerto:** 3001 · **Requerimiento:** RF-06 · **Esquema:** `auth`

Todos los demás servicios dependen de este. Por eso se construyó primero.

## Qué hace

Cuentas del personal, roles, inicio de sesión, sesiones con rotación, segundo factor por TOTP y
bloqueo por intentos fallidos.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/v1/auth/login` | Público |
| `POST` | `/v1/auth/mfa/verificar` | Token parcial |
| `POST` | `/v1/auth/refrescar` | Token de refresco |
| `POST` | `/v1/auth/cerrar-sesion` | Token de refresco |
| `GET` | `/v1/auth/yo` | Autenticado |
| `POST` | `/v1/auth/contrasena` | Autenticado |
| `POST` | `/v1/auth/mfa/configurar` | Autenticado |
| `POST` | `/v1/auth/mfa/activar` | Autenticado |
| `GET` `POST` | `/v1/usuarios` | **Administrador** |
| `GET` `PATCH` | `/v1/usuarios/:id` | **Administrador** |
| `POST` | `/v1/usuarios/:id/restablecer-contrasena` | **Administrador** |

## Poner en marcha

```bash
cp .env.example .env      # y generar los secretos
npx prisma migrate dev
npm run seed              # crea la cuenta administradora inicial
npm run build -w @cap/auth
node dist/main.js         # http://localhost:3001/docs
```

`npm run seed` **no hace nada si ya existe un Administrador**. Ejecutarlo por error no puede crear
una puerta trasera ni restablecer la contraseña de nadie.

## Decisiones que conviene no deshacer

### El token parcial de MFA se firma con otro secreto

Entre el paso de contraseña y el del código hay que emitir algo que identifique al usuario. Si eso
fuera un token normal, **sería un token de acceso válido en todo el sistema** y el segundo factor
quedaría en adorno.

Por eso `JWT_SECRET_MFA` es una llave distinta de `JWT_SECRET`. Ningún otro servicio la conoce, así
que ese token no abre nada aunque se filtre. El servicio se niega a arrancar si ambos secretos son
iguales.

### El token de refresco no es un JWT

Es un valor aleatorio de 256 bits del que se guarda solo el SHA-256. Así puede revocarse de
inmediato — algo que un JWT autocontenido no permite sin mantener una lista negra.

### Rotación con detección de reuso

Cada refresco rota el token y marca el anterior como usado. Si llega un token ya rotado, es señal de
que alguien tiene una copia: **se revoca la familia completa de sesiones**, no solo ese token.

Sí, eso saca también al usuario legítimo. Es deliberado: cuando hay dos copias del mismo token no
hay forma de saber cuál es la del atacante, y volver a iniciar sesión cuesta menos que dejar viva
una sesión robada sobre expedientes clínicos.

### Mismo mensaje para "no existe" y "contraseña incorrecta"

Y se ejecuta una verificación Argon2 contra un hash señuelo cuando el usuario no existe, para que el
tiempo de respuesta sea el mismo. Sin eso, medir la latencia revela qué cuentas son reales.

### Pero sí se avisa cuando la cuenta está bloqueada (HTTP 423)

Esto contradice lo anterior: confirma que la cuenta existe. **Es una decisión consciente.** El
sistema no se expone a Internet abierto — solo lo alcanza el gateway interno — y decirle "vuelva en
12 minutos" a una enfermera en turno vale más que ocultarle información a un atacante que ya está
dentro de la red del CAP.

### El secreto TOTP se guarda cifrado

Con AES-256-GCM, usando `LLAVE_DATOS`. En claro sería equivalente a guardar en claro la contraseña
del segundo factor.

### Tolerancia de reloj de ±30 segundos

Los relojes de los teléfonos se desfasan. Rechazar un código por dos segundos de diferencia genera
llamadas de soporte que nadie va a atender en Purulhá. Es el estándar de la RFC 6238 y no debilita
el mecanismo.

### Los roles administrativos reciben token parcial aunque no tengan MFA configurado

Si se les negara el paso por no tener el segundo factor, **nunca podrían configurarlo** y quedarían
fuera del sistema para siempre.

### Un Administrador no puede desactivarse ni cambiarse el rol a sí mismo

El CAP podría quedarse sin ninguna cuenta capaz de administrar el sistema.

### Desactivar, cambiar de rol o cambiar la contraseña cierra las sesiones

Debe surtir efecto ya, no en quince minutos cuando expire el token de acceso que la persona tenga
abierto.

## Política de contraseñas

Mínimo 10 caracteres, con al menos una letra y un número. **No se exigen símbolos ni mayúsculas a
propósito:** en un CAP con computadoras compartidas, una política demasiado exigente termina en
contraseñas escritas en un papel pegado al monitor, que es peor que una contraseña algo más simple.

## Pruebas

```bash
npm test -w @cap/auth              # 13 unitarias
npm run test:e2e -w @cap/auth      # 26 e2e contra PostgreSQL real
```

Las e2e crean cuentas con prefijo `e2e_` y las borran al terminar.

## Nota sobre Jest y otplib

`otplib` arrastra `@scure/base` y `@noble/hashes`, que se publican solo como ESM. Node 22 puede
hacer `require()` de un módulo ESM, pero el runtime CommonJS de Jest no. Por eso `jest.config.js` y
`test/jest-e2e.json` traen `transformIgnorePatterns` con `.*` en el lookahead — sin ese `.*` no
alcanza los `node_modules` anidados. Ya está en la plantilla, así que los servicios siguientes lo
heredan.

## Pendiente

- Registrar en el servicio de trazabilidad los inicios de sesión, cambios de rol y restablecimientos
  de contraseña (RF-09). Depende de la Etapa 9.
- Contrato `docs/openapi/auth.yaml`, exportable desde Swagger.
