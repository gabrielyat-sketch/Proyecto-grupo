# programas — Servicio de Programas de Salud

**Puerto:** 3003 · **Requerimiento:** RF-03 · **Esquema:** `programas`

Seguimiento de **hipertensión** y **embarazo**. La desnutrición infantil entra en la Etapa 7.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| `GET` `POST` | `/v1/programas/hipertension` | Alta: Médico, Enfermería |
| `GET` | `/v1/programas/hipertension/atrasados` | Clínico + Dirección |
| `GET` `POST` | `/v1/programas/hipertension/:id/controles` | Alta: Médico, Enfermería |
| `PATCH` | `/v1/programas/hipertension/:id/egreso` | Médico, Administrador |
| `GET` `POST` | `/v1/programas/embarazo` | Alta: Médico, Enfermería |
| `GET` | `/v1/programas/embarazo/alto-riesgo` | Clínico + Dirección |
| `GET` `POST` | `/v1/programas/embarazo/:id/controles` | Alta: Médico, Enfermería |
| `PATCH` | `/v1/programas/embarazo/:id/cierre` | Médico, Administrador |

Recepción y Farmacia **no entran** a este servicio: es información clínica.

## La regla central: el sistema calcula, el personal no teclea

La clasificación de presión, las semanas de gestación, la fecha probable de parto, las señales de
alarma y la fecha del próximo control **los calcula el servicio**. Ninguno se recibe del cliente.

Dejarlos como campo libre produce clasificaciones inconsistentes entre turnos y vuelve inservible
cualquier indicador — y a diferencia de un error de programación, esto no rompe nada ni lanza
ninguna excepción: simplemente produce números equivocados sobre la salud de una comunidad durante
meses.

Por eso toda esa lógica vive en `src/dominio/clinico.ts` como **funciones puras**, con 66 pruebas
unitarias que cubren los valores frontera.

## Decisiones clínicas que conviene no deshacer

### Manda la cifra más alta de las dos

Una presión de **118/95 es estadio 2**, aunque la sistólica sea normal. Clasificar solo por
sistólica es el error clásico y deja pacientes sin seguimiento.

### A peor control, cita más cercana

| Clasificación | Próximo control |
|---|---|
| Crisis | 1 día |
| Estadio 2 | 15 días |
| Estadio 1 | 30 días |
| Controlado | 90 días |

Una crisis hipertensiva no se cita en un mes.

### El control prenatal se acerca conforme avanza el embarazo

Hasta la semana 28 cada 4 semanas; de 28 a 36 cada 2; desde la 36 cada semana. En un área rural esto
importa: citar en un mes a una mujer de 38 semanas que vive a dos horas del CAP es citarla **después
del parto**.

### El riesgo sube solo, pero nunca baja solo

Si un control detecta presión elevada, el embarazo pasa a alto riesgo automáticamente. Un control
normal posterior **no lo devuelve a bajo**: eso es criterio del personal, no del sistema.

### El edema aislado no alarma; con presión alta sí

El edema es frecuente y normal en el embarazo. Alertar por edema solo generaría tantas alarmas que
el personal dejaría de mirarlas.

### La sistólica debe ser mayor que la diastólica

Si llegan invertidas, son cifras mal tecleadas. Se rechaza en vez de guardar un dato imposible.

## El huso horario de Guatemala no es un detalle

Un CAP es un Centro de Atención **Permanente**: atiende de noche. Con las fechas calculadas en UTC,
un control registrado a las 19:00 en Purulhá ya cae en el día siguiente y **la cita se agendaba un
día corrido**.

`fechaDelDia()` convierte el instante al día del calendario en Purulhá (UTC-6, sin horario de
verano) antes de calcular. Las fechas que ya vienen sin hora — la FUM, la fecha de nacimiento — no
se tocan: desplazarlas las retrasaría un día.

Hay seis pruebas que cubren esto, incluidos los controles de las 19:00 y las 23:30.

## Llamada al servicio de usuarios

Es la única llamada síncrona entre servicios de este microservicio, y está justificada: al inscribir
a alguien hay que saber **en ese momento** si el paciente existe, y su edad, sexo y comunidad.

`ClientePacientes` sigue las reglas de la arquitectura §8.3:

- **Timeout de 2 s.** Más vale fallar rápido que dejar colgada la pantalla del personal.
- **Un solo salto.** Este servicio no encadena llamadas a un tercero.
- **Propaga el token del usuario**, para que `usuarios` aplique *sus* permisos. Sin eso, este
  servicio sería una puerta trasera a los expedientes.
- **Propaga el `trazaId`**, para poder seguir la petición entre los dos servicios.
- **Traduce los códigos**: un 404 del otro servicio es "el paciente no existe" (400), no un error
  interno; un 500 ajeno es 502, no 500 propio.

En las pruebas e2e el cliente se sustituye por un doble. Su contrato se prueba aparte, en
`cliente-pacientes.spec.ts` (10 pruebas): así se prueba la lógica de los programas sin depender de
que otro servicio esté levantado.

## Desnormalización deliberada: `comunidadId`

Se copia al inscribir para poder agrupar indicadores por comunidad sin llamar a `usuarios` en cada
consulta. Si el paciente cambia de comunidad, este dato queda como estaba al inscribirse — que es
justo lo que interesa para el reporte.

## Pacientes con control vencido

`GET /v1/programas/hipertension/atrasados` resuelve el requerimiento SHOULD de alertas. Usa un
`JOIN LATERAL` para traer el último control de cada programa en una sola consulta, en vez de
recorrer los programas en memoria.

## Poner en marcha

```bash
cp .env.example .env
npx prisma migrate dev
npm run build -w @cap/programas
node dist/main.js            # http://localhost:3003/docs
```

Necesita el servicio `usuarios` levantado en el puerto 3002 (`URL_USUARIOS`).

## Pruebas

```bash
npm test -w @cap/programas             # 66 unitarias
npm run test:e2e -w @cap/programas     # 32 e2e contra PostgreSQL real
```

## Pendiente

- Desnutrición infantil (Etapa 7).
- Registrar en trazabilidad la inscripción y los controles (RF-09, Etapa 9).
- Alertas automáticas por paciente sin control: la consulta existe, falta el envío de la alerta.
