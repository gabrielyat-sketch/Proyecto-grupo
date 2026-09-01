# Proyecto-grupo — Plataforma Inteligente CAP Purulhá

Sistema de información para el **Centro de Atención Permanente de Purulhá, Baja Verapaz**.

Proyecto de Seminario · Equipo de 3 integrantes.

## Qué contiene el repositorio

| Carpeta | Qué es |
|---|---|
| `cap-sistema/` | **Monorepo del sistema del CAP.** 8 microservicios, librería compartida, panel web e infraestructura |
| `cap-movil/` | App Android para la comunidad (Flutter). Producto independiente |
| `documentacion/` | Plan de desarrollo, SRS, actas, formatos oficiales de fichas |
| `.claude/skills/` | Skills de Claude Code del equipo |
| `arquitectura-cap-purulha.md` | **Documento rector.** Estado: DEFINITIVA |

## El documento que manda

`arquitectura-cap-purulha.md` está en estado **DEFINITIVA**: las cinco decisiones críticas
(interoperabilidad, plazo, formatos de ficha, volumen de datos y cuenta de nube) están cerradas.

Toda decisión técnica sale de ahí. Si el código y el documento se contradicen, se corrige uno de los
dos — **nunca se dejan en desacuerdo en silencio**.

## Los dos productos

**Sistema web del CAP** — interno, autenticado, para el personal. Expedientes, programas de salud,
medicamentos, indicadores e impresión de fichas oficiales ya llenas.

**App móvil** — pública, anónima, para la comunidad de Purulhá. Solo contenido educativo.
**Nunca accede a datos clínicos.** Consume el gateway público de solo lectura.

Están en el mismo repositorio por conveniencia del equipo, pero son productos separados con ciclos
de publicación distintos. La separación que importa no es la del repositorio: es que **no existe
ninguna ruta de red entre la app pública y los datos clínicos**.

## Flujo de ramas

```
main                      producción — solo recibe merges desde develop
 └── develop              integración — de aquí salen y aquí vuelven las features
      ├── feature/...     una por tarea
      ├── fix/...         corrección de un error
      └── hotfix/...      urgencia sobre producción
```

Reglas: Pull Request obligatorio con al menos **1 revisor**. Nadie commitea directo a `main`.

## Arrancar el entorno local

```bash
cd cap-sistema
cp .env.example .env       # rellenar los valores marcados CAMBIAR
npm install
npm run infra:up           # PostgreSQL 16 + Redis 7
```

Generar las llaves de cifrado (una para `LLAVE_DATOS`, otra para `LLAVE_INDICE`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Advertencia sobre datos

Este sistema maneja **datos de salud de pacientes reales**, clasificados como datos sensibles por el
Decreto 57-2008. Los ambientes de desarrollo y pruebas usan datos ficticios o anonimizados,
**nunca copias de producción**.
