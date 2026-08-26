# Servicios pendientes de construir

Los cuatro microservicios que faltan. **No existen como carpeta todavía**: cada uno se crea copiando
`services/_plantilla` cuando llega su etapa, siguiendo el procedimiento de su README.

Este documento guarda las decisiones de diseño ya tomadas para cada uno, para que quien lo construya
no tenga que redescubrirlas.

| Servicio | Puerto | Esquema | RF | Etapa |
|---|---|---|---|---|
| `trazabilidad` | 3007 | `trazabilidad` | RF-09 | 9 |
| `reportes` | 3005 | `reportes` | RF-04, RF-07 | 10 y 11 |
| `cms` | 3006 | `cms` | RF-05 | 12 |
| `ml` | 3008 | `ml` | — (COULD) | Opcional |

Los esquemas y usuarios de base de datos de los cinco **ya están creados** en
`infra/postgres/init.sql`. No hay que tocar ese archivo al construirlos.

---

## trazabilidad — Etapa 9

**Responsabilidad:** cadena de hash append-only. Auditoría de cambios, consultas sensibles e
impresiones (RF-09).

### La restricción que lo sostiene

El usuario `cap_trazabilidad` tiene **`SELECT` e `INSERT`, pero NO `UPDATE` ni `DELETE`**. Es
deliberado: ni la propia aplicación puede alterar la traza. Ya está así en
`infra/postgres/init.sql`, y hay pruebas que lo verifican.

La cadena: `hash_n = SHA256(hash_(n-1) || contenido_n)`. Alterar un registro pasado rompe toda la
cadena posterior.

Sin las protecciones que la acompañan — usuario sin `UPDATE`, hash raíz diario firmado fuera de la
base, copia en respaldos y procedimiento de verificación ejecutable — el mecanismo sería solo
decorativo.

### Es el pendiente que más se acumula

`auth`, `usuarios` y `programas` **no auditan nada todavía**. Cada etapa que pasa son más rutas de
escritura que habrá que volver a tocar para conectarlas.

---

## reportes — Etapas 10 y 11

**Responsabilidad:** modelo de lectura por eventos, panel de indicadores y generación de PDF.

### Dos contenedores, un solo código

| Proceso | Función |
|---|---|
| `reportes-api` | Atiende HTTP y consume eventos del bus |
| `reportes-worker` | Genera PDF con Chromium headless |

Se separan porque Chromium es **el mayor consumidor de RAM del sistema** y el Droplet tiene 4 GB. El
worker corre con `mem_limit: 512m` y concurrencia máxima 2. Si tumbara el proceso principal, caería
también el panel de indicadores.

### Modelo de lectura

Este servicio **no consulta a los otros servicios**. Mantiene su propia tabla de indicadores ya
calculados, alimentada por eventos, más un recálculo nocturno de reconciliación.

Las tablas `outbox` de `usuarios` y `programas` ya se escriben en la misma transacción que el cambio
de negocio. Falta el publicador que las lleve al bus.

### Debe incluir las cifras que el CAP reporta al MSPAS

No hay integración con SIGSA (decisión P-1). El personal las transcribe a mano. Si además tuviera
que recontarlas, el sistema le estaría agregando trabajo en vez de quitárselo.

---

## cms — Etapa 12

**Responsabilidad:** contenido educativo. Única fuente de la app móvil.

### Único servicio alcanzable desde el gateway público

Es la única puerta entre la comunidad y el sistema. Por el gateway público:

- Solo `GET`, nunca escritura.
- Solo contenido **marcado como publicado**.
- Sin autenticación, con límite de peticiones por IP y caché.

Aunque ese endpoint fuera comprometido, el atacante solo alcanzaría contenido educativo que ya es
público por definición.

### Pertinencia cultural

En Purulhá se habla poqomchi' y q'eqchi'. La estructura de contenido debe admitir pictogramas, audio
y varios idiomas — aunque el contenido multilingüe se cargue después.

---

## ml — opcional (COULD)

**Responsabilidad:** detección de patrones en los programas de salud.

Clasificado **COULD**: su ausencia no impide la entrega del sistema, y está completamente
desacoplado — ningún otro servicio depende de él.

### La excepción de lenguaje

Es el único servicio donde **Python está justificado** en lugar de TypeScript, por el ecosistema de
análisis de datos. Ver `docs/decisiones/ADR-001-lenguaje-y-framework.md`.
