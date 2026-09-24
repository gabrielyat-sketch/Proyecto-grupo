# cap-movil — App Android para la comunidad de Purulhá

App independiente del sistema del CAP (arquitectura §6.2, §7.4): no importa código de `cap-sistema/`.

## Qué es

Aplicación Flutter de uso **anónimo** para los habitantes de Purulhá. Muestra información de salud
preparada por el personal del CAP en tres ejes:

1. **Presión alta** (hipertensión arterial)
2. **Niñez y nutrición** (desnutrición infantil, los primeros mil días)
3. **Embarazo y familia** (control prenatal, planificación familiar, embarazo en adolescentes)

Cada eje tiene sus temas, una lista de señales de alarma y una prueba corta. Todas las alarmas están
también juntas en una sola pantalla, a un toque desde el inicio.

## Qué NO es

- No accede a expedientes clínicos. Nunca.
- No tiene registro de usuarios ni almacena datos personales. No guarda ni las respuestas de las pruebas.
- **No usa internet.** El contenido va fijo dentro de la app (decisión del 24 sep 2026): el CAP lo
  entregó cerrado y la señal en el área es intermitente. El CMS y el gateway público de la
  arquitectura original quedan para una versión futura, si hace falta publicar contenido sin
  sacar una versión nueva.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Textos de los tres ejes | `lib/datos/eje_*.dart` (transcritos del documento del CAP) |
| Datos que faltan del CAP (horarios, teléfonos…) | `lib/datos/datos_cap.dart` — mientras sean `null` no se muestran |
| Colores, fuentes y medidas | `lib/tema.dart` |
| Cómo se dibuja cada tipo de bloque | `lib/widgets/bloques.dart` |
| Pantallas | `lib/pantallas/` |

Para corregir un texto se edita el archivo del eje; no hay que tocar pantallas.

## Correr

```bash
flutter test                 # contenido y pantallas
flutter run -d chrome        # en el navegador (no hay emulador en la máquina de desarrollo)
flutter run                  # en el celular conectado por USB
flutter build apk --release --obfuscate --split-debug-info=build/simbolos
```

## Objetivo de compatibilidad

Android 8.0 (API 26) o superior.
