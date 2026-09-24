import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import '../tema.dart';

/// Texto con `**negrita**`.
class TextoRico extends StatelessWidget {
  const TextoRico(this.texto, {super.key, this.estilo, this.colorNegrita});

  final String texto;
  final TextStyle? estilo;
  final Color? colorNegrita;

  @override
  Widget build(BuildContext context) {
    final base = estilo ?? Theme.of(context).textTheme.bodyLarge!;
    final partes = texto.split('**');
    return Text.rich(
      TextSpan(
        style: base,
        children: [
          for (var i = 0; i < partes.length; i++)
            TextSpan(
              text: partes[i],
              style: i.isOdd
                  ? TextStyle(fontWeight: FontWeight.w700, color: colorNegrita)
                  : null,
            ),
        ],
      ),
    );
  }
}

/// Dibuja la lista de bloques de una lección con el color de su eje.
class VistaBloques extends StatelessWidget {
  const VistaBloques({super.key, required this.bloques, required this.color});

  final List<Bloque> bloques;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final hijos = <Widget>[];
    for (final b in bloques) {
      final w = _bloque(b);
      if (w == null) continue;
      hijos.add(Padding(
        padding: EdgeInsets.only(
          top: b is Subtitulo ? Esp.xl : 0,
          bottom: Esp.l,
        ),
        child: w,
      ));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: hijos);
  }

  Widget? _bloque(Bloque b) => switch (b) {
        Parrafo(:final texto) => TextoRico(texto),
        Subtitulo(:final texto) => Semantics(
            header: true,
            child: Text(texto, style: Fuentes.titular(21, color: color)),
          ),
        Lista() => _ListaVista(b, color),
        Tabla() => _TablaVista(b, color),
        Aviso() => AvisoVista(b),
        Senales() => SenalesVista(items: b.items, titulo: b.titulo),
        Cifra() => _CifraVista(b, color),
        DatoCap(:final valor) => valor == null ? null : _DatoVista(b),
      };
}

class _ListaVista extends StatelessWidget {
  const _ListaVista(this.lista, this.color);

  final Lista lista;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < lista.items.length; i++)
          Padding(
            padding: EdgeInsets.only(
                bottom: i == lista.items.length - 1 ? 0 : Esp.m),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (lista.numerada)
                  Container(
                    width: 30,
                    height: 30,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                    child: Text(
                      '${i + 1}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.only(top: 9, left: 4, right: 4),
                    child: Transform.rotate(
                      angle: 0.785,
                      child: Container(width: 9, height: 9, color: color),
                    ),
                  ),
                const SizedBox(width: Esp.m),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(top: lista.numerada ? 2 : 0),
                    child: TextoRico(lista.items[i]),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Cada fila es una tarjeta: la primera columna es su título y el resto va
/// como "etiqueta: valor". Así una tabla de cuatro columnas se lee bien en un
/// celular angosto sin desplazarse de lado.
class _TablaVista extends StatelessWidget {
  const _TablaVista(this.tabla, this.color);

  final Tabla tabla;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Column(
      children: [
        for (final fila in tabla.filas)
          Container(
            margin: const EdgeInsets.only(bottom: Esp.s),
            decoration: BoxDecoration(
              color: Colores.superficie,
              borderRadius: BorderRadius.circular(Curva.chip + 4),
              border: Border.all(color: Colores.borde),
            ),
            clipBehavior: Clip.antiAlias,
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(width: 5, color: color),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(
                          Esp.l, Esp.m, Esp.l, Esp.m),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(fila.first,
                              style: t.titleMedium!.copyWith(color: color)),
                          for (var c = 1; c < fila.length; c++) ...[
                            const SizedBox(height: Esp.xs),
                            if (tabla.columnas.length > 2)
                              Text(
                                tabla.columnas[c].toUpperCase(),
                                style: t.labelSmall!.copyWith(
                                  color: Colores.textoSuave,
                                  letterSpacing: 0.8,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            Text(fila[c], style: t.bodyLarge),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class AvisoVista extends StatelessWidget {
  const AvisoVista(this.aviso, {super.key});

  final Aviso aviso;

  @override
  Widget build(BuildContext context) {
    final (Color fg, Color bg, IconData icono, String etiqueta) =
        switch (aviso.tono) {
      Tono.info => (
          Colores.marca,
          const Color(0xFFE4EEEF),
          Icons.info_outline_rounded,
          'Información'
        ),
      Tono.consejo => (
          Colores.bien,
          Colores.bienTinte,
          Icons.lightbulb_outline_rounded,
          'Consejo'
        ),
      Tono.cuidado => (
          const Color(0xFF8A6100),
          const Color(0xFFFBF0D5),
          Icons.priority_high_rounded,
          'Tenga en cuenta'
        ),
      Tono.alarma => (
          Colores.alarma,
          Colores.alarmaTinte,
          Icons.warning_amber_rounded,
          'Importante'
        ),
    };
    final t = Theme.of(context).textTheme;
    return Semantics(
      container: true,
      label: aviso.titulo ?? etiqueta,
      child: Container(
        padding: const EdgeInsets.all(Esp.l),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(Curva.tarjeta - 4),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icono, color: fg, size: 26),
            const SizedBox(width: Esp.m),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (aviso.titulo != null) ...[
                    Text(aviso.titulo!,
                        style: t.titleMedium!.copyWith(color: fg)),
                    const SizedBox(height: Esp.xs),
                  ],
                  TextoRico(aviso.texto, colorNegrita: fg),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Lista de señales de peligro. Siempre en rojo, siempre con icono: el estado
/// no se dice solo con color.
class SenalesVista extends StatelessWidget {
  const SenalesVista({super.key, required this.items, this.titulo});

  final List<String> items;
  final String? titulo;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Container(
      decoration: BoxDecoration(
        color: Colores.superficie,
        borderRadius: BorderRadius.circular(Curva.tarjeta),
        border: Border.all(color: Colores.alarma, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (titulo != null)
            Container(
              color: Colores.alarma,
              padding: const EdgeInsets.symmetric(
                  horizontal: Esp.l, vertical: Esp.m),
              child: Semantics(
                header: true,
                child: Text(
                  titulo!,
                  style: t.titleMedium!.copyWith(color: Colors.white),
                ),
              ),
            ),
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              const Divider(indent: Esp.l, endIndent: Esp.l, height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: Esp.l, vertical: Esp.m),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Icon(Icons.error_rounded,
                        color: Colores.alarma, size: 22),
                  ),
                  const SizedBox(width: Esp.m),
                  Expanded(child: Text(items[i], style: t.bodyLarge)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CifraVista extends StatelessWidget {
  const _CifraVista(this.cifra, this.color);

  final Cifra cifra;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(Esp.l, Esp.l, Esp.l, Esp.l),
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(cifra.valor,
              style: Fuentes.titular(44, peso: 700, color: color)),
          const SizedBox(height: Esp.xs),
          Text(cifra.texto, style: Theme.of(context).textTheme.bodyLarge),
        ],
      ),
    );
  }
}

class _DatoVista extends StatelessWidget {
  const _DatoVista(this.dato);

  final DatoCap dato;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(Esp.l),
      decoration: BoxDecoration(
        color: Colores.superficie,
        borderRadius: BorderRadius.circular(Curva.tarjeta - 4),
        border: Border.all(color: Colores.borde),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: Color(0xFFE4EEEF),
              shape: BoxShape.circle,
            ),
            child: Icon(dato.icono, color: Colores.marca),
          ),
          const SizedBox(width: Esp.m),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(dato.etiqueta,
                    style: t.bodyMedium!.copyWith(color: Colores.textoSuave)),
                Text(dato.valor!, style: t.titleMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
