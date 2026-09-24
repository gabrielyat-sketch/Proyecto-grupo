import 'package:flutter/material.dart';

/// Tema de la app de la comunidad.
///
/// La base es la del panel del CAP —el verde azulado del logo— para que la
/// app se reconozca como del mismo centro de salud. Lo que cambia es el tono:
/// el panel es una herramienta de trabajo y esta app se lee en casa, así que
/// el fondo es un papel cálido en vez de gris y cada eje tiene su color.
///
/// Los colores de los ejes salen de los tejidos de la región —añil, maíz y
/// fucsia— y el rojo queda reservado solo para las señales de alarma: si el
/// rojo significa "vaya ya al CAP", no puede ser también el color de un tema.
///
/// Todas las combinaciones de texto pasan 4.5:1 (medido, no a ojo).
abstract final class Colores {
  /// Verde azulado del logo y del panel. 9.8:1 con blanco.
  static const marca = Color(0xFF164A55);

  /// El verde azulado un paso más claro, para realces sobre la marca.
  static const marcaClaro = Color(0xFF107273);

  /// Fondo: papel de algodón, no blanco puro. Descansa la vista al leer.
  static const papel = Color(0xFFF7F3EC);
  static const superficie = Color(0xFFFFFFFF);
  static const borde = Color(0xFFE6DFD3);

  /// 13.2:1 sobre papel.
  static const texto = Color(0xFF1D2B2F);

  /// 5.4:1 sobre papel.
  static const textoSuave = Color(0xFF56666A);

  /// Rojo de alarma. 6.5:1 con blanco. Solo para señales de peligro.
  static const alarma = Color(0xFFB3261E);
  static const alarmaTinte = Color(0xFFFDECEB);

  static const bien = Color(0xFF1B7A3D);
  static const bienTinte = Color(0xFFE3F3E8);

  // Los tres ejes. El color fuerte sirve de texto e icono (≥ 5.6:1 sobre su
  // tinte); el vivo es solo decorativo, nunca lleva texto encima.
  static const anil = Color(0xFF2E4A93);
  static const anilTinte = Color(0xFFE7ECF8);
  static const maiz = Color(0xFF855400);
  static const maizTinte = Color(0xFFFBEFD4);
  static const maizVivo = Color(0xFFE8A317);
  static const fucsia = Color(0xFF9A2A67);
  static const fucsiaTinte = Color(0xFFF8E6EF);
}

abstract final class Fuentes {
  static const cuerpo = 'Atkinson';
  static const titulo = 'Fraunces';

  /// Fraunces es variable: el peso se pide por su eje, no por `fontWeight`.
  static TextStyle titular(double tamano, {double peso = 600, Color? color}) =>
      TextStyle(
        fontFamily: titulo,
        fontSize: tamano,
        height: 1.15,
        letterSpacing: -0.3,
        color: color ?? Colores.texto,
        fontWeight: peso >= 600 ? FontWeight.w600 : FontWeight.w400,
        fontVariations: [
          FontVariation('wght', peso),
          // Óptica de titular y trazo suave: es lo que le da calidez.
          FontVariation('opsz', tamano.clamp(9, 144)),
          const FontVariation('SOFT', 100),
        ],
      );
}

/// Espaciado en múltiplos de 4.
abstract final class Esp {
  static const xs = 4.0;
  static const s = 8.0;
  static const m = 12.0;
  static const l = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
}

abstract final class Curva {
  static const tarjeta = 20.0;
  static const boton = 14.0;
  static const chip = 10.0;
}

ThemeData crearTema() {
  final base = ThemeData(
    useMaterial3: true,
    fontFamily: Fuentes.cuerpo,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colores.marca,
      primary: Colores.marca,
      surface: Colores.papel,
      error: Colores.alarma,
    ),
    scaffoldBackgroundColor: Colores.papel,
  );

  return base.copyWith(
    // 17 de base: la app la leen personas mayores y con poca práctica de
    // lectura en pantalla. Atkinson Hyperlegible está hecha para eso.
    textTheme: base.textTheme
        .copyWith(
          bodyLarge: const TextStyle(fontSize: 17.5, height: 1.55),
          bodyMedium: const TextStyle(fontSize: 16, height: 1.5),
          titleMedium:
              const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          labelLarge:
              const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        )
        // La fuente otra vez: los estilos redefinidos arriba no la heredan.
        .apply(
          fontFamily: Fuentes.cuerpo,
          bodyColor: Colores.texto,
          displayColor: Colores.texto,
        ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: Colores.texto,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(64, 52),
        padding: const EdgeInsets.symmetric(horizontal: Esp.xl),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Curva.boton),
        ),
        textStyle: const TextStyle(
          fontFamily: Fuentes.cuerpo,
          fontSize: 17,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(64, 52),
        foregroundColor: Colores.marca,
        side: const BorderSide(color: Colores.marca, width: 1.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Curva.boton),
        ),
        textStyle: const TextStyle(
          fontFamily: Fuentes.cuerpo,
          fontSize: 17,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    dividerTheme: const DividerThemeData(color: Colores.borde, space: 1),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
      },
    ),
  );
}
