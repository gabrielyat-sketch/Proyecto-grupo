# cap-movil — App Android para la comunidad de Purulhá

**Repositorio independiente del sistema del CAP** (arquitectura §6.2, §7.4).

## Qué es

Aplicación Flutter de uso **anónimo** para los habitantes de Purulhá. Muestra contenido educativo
de salud publicado por el personal del CAP.

## Qué NO es

- No accede a expedientes clínicos. Nunca.
- No tiene registro de usuarios ni almacena datos personales.
- No tiene backend propio: consume el CMS del sistema del CAP a través del **gateway público**.

## Reglas que no se negocian

| Regla | Motivo |
|---|---|
| Solo peticiones `GET` al gateway público | Es de solo lectura por diseño |
| Nunca almacenar tokens ni datos clínicos | La app es anónima; no hay nada que proteger porque no hay nada sensible |
| Certificate pinning en producción | Evita interceptación en redes públicas |
| Ofuscación en la compilación de release | Requisito de seguridad móvil del plan |
| Caché local del contenido | La conectividad en el área es intermitente |

## Estado

Pendiente de inicializar. Se crea con `flutter create` cuando arranque la Etapa 12
(el gateway público es su única dependencia).

## Objetivo de compatibilidad

Android 8.0 (API 26) o superior.
