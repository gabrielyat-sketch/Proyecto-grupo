import 'package:flutter/material.dart';

/// El contenido educativo va fijo dentro de la app (lo dio el CAP de Purulhá).
///
/// Cada lección es una lista de bloques; la pantalla de lectura solo sabe
/// dibujar bloques, así que agregar o corregir un tema es editar datos, no
/// pantallas. En los textos, `**así**` se muestra en negrita.
sealed class Bloque {
  const Bloque();
}

class Parrafo extends Bloque {
  const Parrafo(this.texto);
  final String texto;
}

/// Un subtítulo dentro de la lección.
class Subtitulo extends Bloque {
  const Subtitulo(this.texto);
  final String texto;
}

class Lista extends Bloque {
  const Lista(this.items, {this.numerada = false});
  final List<String> items;
  final bool numerada;
}

/// Tabla del documento. En el celular se dibuja como tarjetas apiladas, una
/// por fila: una tabla de cuatro columnas no cabe en 360 px de ancho.
class Tabla extends Bloque {
  const Tabla(this.columnas, this.filas);
  final List<String> columnas;
  final List<List<String>> filas;
}

enum Tono { info, consejo, cuidado, alarma }

/// Recuadro para lo que el documento resalta.
class Aviso extends Bloque {
  const Aviso(this.tono, this.texto, {this.titulo});
  final Tono tono;
  final String texto;
  final String? titulo;
}

/// Lista de señales de peligro: se dibuja en rojo y con su icono.
class Senales extends Bloque {
  const Senales(this.items, {this.titulo});
  final List<String> items;
  final String? titulo;
}

/// Un dato que tiene que llenar el CAP (horarios, teléfonos...).
///
/// Si todavía no hay valor, el bloque no se dibuja: es mejor no decir nada
/// que mostrar un horario inventado. Los valores viven en `datos_cap.dart`.
class DatoCap extends Bloque {
  const DatoCap(this.etiqueta, this.valor, {this.icono = Icons.info_outline});
  final String etiqueta;
  final String? valor;
  final IconData icono;
}

/// Una cifra grande con su explicación.
class Cifra extends Bloque {
  const Cifra(this.valor, this.texto);
  final String valor;
  final String texto;
}

class Leccion {
  const Leccion({
    required this.id,
    required this.titulo,
    required this.resumen,
    required this.bloques,
    this.icono = Icons.menu_book_outlined,
    this.esAlarma = false,
  });

  final String id;
  final String titulo;
  final String resumen;
  final IconData icono;
  final List<Bloque> bloques;

  /// Las lecciones de señales de alarma se destacan en rojo y aparecen
  /// también en la pantalla de alarmas.
  final bool esAlarma;
}

class Seccion {
  const Seccion({this.titulo, required this.lecciones});
  final String? titulo;
  final List<Leccion> lecciones;
}

class Pregunta {
  const Pregunta({
    required this.enunciado,
    required this.opciones,
    required this.correcta,
    required this.explicacion,
  });

  final String enunciado;
  final List<String> opciones;
  final int correcta;
  final String explicacion;
}

class Prueba {
  const Prueba({
    required this.id,
    required this.titulo,
    required this.descripcion,
    required this.preguntas,
    this.mitoVerdad = false,
  });

  final String id;
  final String titulo;
  final String descripcion;
  final List<Pregunta> preguntas;

  /// En "mitos y verdades" las opciones son siempre las mismas dos y se
  /// muestran lado a lado, no como lista con letras.
  final bool mitoVerdad;
}

class Eje {
  const Eje({
    required this.id,
    required this.nombre,
    required this.nombreLargo,
    required this.lema,
    required this.color,
    required this.tinte,
    required this.icono,
    required this.secciones,
    required this.prueba,
    this.porQueImporta = const [],
  });

  final String id;
  final String nombre;
  final String nombreLargo;
  final String lema;
  final Color color;
  final Color tinte;
  final IconData icono;
  final List<Bloque> porQueImporta;
  final List<Seccion> secciones;
  final Prueba prueba;

  Iterable<Leccion> get lecciones => secciones.expand((s) => s.lecciones);
}

/// Un grupo de la pantalla de alarmas.
class GrupoAlarma {
  const GrupoAlarma({
    required this.titulo,
    required this.quien,
    required this.icono,
    required this.senales,
    required this.leccionId,
  });

  final String titulo;
  final String quien;
  final IconData icono;
  final List<String> senales;
  final String leccionId;
}
