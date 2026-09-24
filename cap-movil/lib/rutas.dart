import 'package:flutter/material.dart';

import 'datos/catalogo.dart';
import 'pantallas/acerca.dart';
import 'pantallas/alarmas.dart';
import 'pantallas/eje.dart';
import 'pantallas/inicio.dart';
import 'pantallas/leccion.dart';
import 'pantallas/no_encontrado.dart';
import 'pantallas/prueba.dart';

/// Rutas con nombre: `/eje/ninez`, `/leccion/emb-control`...
///
/// Con nombre y no con `MaterialPageRoute` suelto para que en la versión web
/// cada pantalla tenga su dirección y se pueda abrir directo.
abstract final class Rutas {
  static const inicio = '/';
  static const alarmas = '/alarmas';
  static const acerca = '/acerca';
  static String eje(String id) => '/eje/$id';
  static String leccion(String id) => '/leccion/$id';
  static String prueba(String id) => '/prueba/$id';

  static Route<void> generar(RouteSettings ajustes) {
    final partes = Uri.parse(ajustes.name ?? '/').pathSegments;
    final Widget pantalla = switch (partes) {
      [] => const PantallaInicio(),
      ['alarmas'] => const PantallaAlarmas(),
      ['acerca'] => const PantallaAcerca(),
      ['eje', final id] => switch (ejePorId(id)) {
          final eje? => PantallaEje(eje: eje),
          null => const PantallaNoEncontrado(),
        },
      ['leccion', final id] => switch (leccionPorId(id)) {
          (final eje, final leccion) => PantallaLeccion(eje: eje, leccion: leccion),
          null => const PantallaNoEncontrado(),
        },
      ['prueba', final id] => switch (pruebaPorId(id)) {
          (final eje, final prueba) => PantallaPrueba(eje: eje, prueba: prueba),
          null => const PantallaNoEncontrado(),
        },
      _ => const PantallaNoEncontrado(),
    };
    return MaterialPageRoute(settings: ajustes, builder: (_) => pantalla);
  }
}
