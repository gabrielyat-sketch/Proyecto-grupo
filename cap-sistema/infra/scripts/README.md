# Scripts de operación

Procedimientos que el CAP debe poder ejecutar **sin el equipo de desarrollo**.
Ese es el criterio: si un script solo lo sabe correr quien lo escribió, no sirve.

## Scripts esperados

| Script | Para qué |
|---|---|
| `respaldo.sh` | Respaldo manual bajo demanda (el automático lo hace DigitalOcean) |
| `restaurar.sh` | Restauración desde respaldo. **Debe probarse de extremo a extremo antes de producción** |
| `verificar-cadena.ts` | Recorre la cadena de hash y detecta alteraciones |
| `generar-llaves.ts` | Genera `LLAVE_DATOS` y `LLAVE_INDICE` |
| `cargar-datos-prueba.ts` | **100,000 pacientes sintéticos** para la prueba de carga de la Etapa 4 |
| `reconciliar-indicadores.ts` | Recálculo nocturno del modelo de lectura |

## Un respaldo sin restauración probada no es un respaldo

Es el error más común y el más caro. `restaurar.sh` debe ejecutarse de verdad, contra una copia,
antes de que el sistema tenga datos reales de pacientes.

## Advertencia sobre datos reales

Ningún script se ejecuta contra producción sin respaldo previo verificado. Los ambientes de
desarrollo y pruebas usan datos ficticios o anonimizados, **nunca copias de producción**.
