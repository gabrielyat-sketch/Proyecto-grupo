# Nginx — Los dos gateways

Nginx atiende **dos puntos de entrada separados** (arquitectura §3.1, §5.1).

| | Gateway interno | Gateway público |
|---|---|---|
| Quién lo usa | Personal del CAP (web) | Comunidad (app móvil) |
| Autenticación | JWT + RBAC + MFA en roles administrativos | Ninguna, anónimo |
| Operaciones | Lectura y escritura | **Solo lectura** |
| Servicios alcanzables | Los ocho | **Únicamente `cms`** |
| Protecciones | Lista blanca de origen, expiración de sesión | Límite por IP, caché, sin escritura |

## La regla que no se toca

**No debe existir ninguna ruta de red entre el gateway público y los servicios clínicos.**

Aunque el endpoint público fuera comprometido, el atacante solo alcanzaría contenido educativo que
ya es público por definición. Agregar un `proxy_pass` desde el gateway público hacia cualquier
servicio que no sea `cms` **destruye esa garantía** — y no es un descuido teórico: es la clase de
cambio que alguien hace en cinco minutos para "resolver algo rápido".

## Criterio de verificación (Etapa 12)

Un escaneo debe confirmar que desde el endpoint público **no se alcanza ningún servicio clínico**,
y que el límite de peticiones corta el abuso.

## Archivos esperados

- `gateway-interno.conf`
- `gateway-publico.conf`
- `comun/seguridad.conf` — cabeceras de seguridad compartidas
