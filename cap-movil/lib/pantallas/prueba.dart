import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import '../modelo/contenido.dart';
import '../tema.dart';
import '../widgets/marco.dart';

class PantallaPrueba extends StatefulWidget {
  const PantallaPrueba({super.key, required this.eje, required this.prueba});

  final Eje eje;
  final Prueba prueba;

  @override
  State<PantallaPrueba> createState() => _PantallaPruebaState();
}

class _PantallaPruebaState extends State<PantallaPrueba> {
  int _actual = 0;
  int? _elegida;
  int _aciertos = 0;

  /// Orden en que se muestran las opciones de cada pregunta.
  ///
  /// En el documento la respuesta correcta es casi siempre la b); sin
  /// mezclar, se acierta la prueba entera sin leerla.
  late List<List<int>> _orden;

  @override
  void initState() {
    super.initState();
    _mezclar();
  }

  void _mezclar() {
    final azar = Random();
    _orden = [
      for (final p in widget.prueba.preguntas)
        widget.prueba.mitoVerdad
            ? List.generate(p.opciones.length, (i) => i)
            : (List.generate(p.opciones.length, (i) => i)..shuffle(azar)),
    ];
  }

  bool get _terminada => _actual >= widget.prueba.preguntas.length;

  void _responder(int opcion) {
    if (_elegida != null) return;
    final p = widget.prueba.preguntas[_actual];
    final bien = opcion == p.correcta;
    setState(() {
      _elegida = opcion;
      if (bien) _aciertos++;
    });
    SemanticsService.sendAnnouncement(
      View.of(context),
      bien ? 'Correcto. ${p.explicacion}' : 'No es así. ${p.explicacion}',
      TextDirection.ltr,
    );
  }

  void _siguiente() => setState(() {
        _actual++;
        _elegida = null;
      });

  void _reiniciar() => setState(() {
        _actual = 0;
        _elegida = null;
        _aciertos = 0;
        _mezclar();
      });

  @override
  Widget build(BuildContext context) {
    final eje = widget.eje;
    final total = widget.prueba.preguntas.length;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colores.papel,
        titleSpacing: 0,
        title: Text(widget.prueba.titulo,
            style: Theme.of(context)
                .textTheme
                .titleMedium!
                .copyWith(color: eje.color)),
      ),
      body: SafeArea(
        top: false,
        child: AnimatedSwitcher(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 220),
          child: _terminada
              ? _Resultado(
                  key: const ValueKey('fin'),
                  eje: eje,
                  aciertos: _aciertos,
                  total: total,
                  alReiniciar: _reiniciar,
                )
              : _VistaPregunta(
                  key: ValueKey(_actual),
                  eje: eje,
                  prueba: widget.prueba,
                  indice: _actual,
                  orden: _orden[_actual],
                  elegida: _elegida,
                  alResponder: _responder,
                  alSeguir: _siguiente,
                ),
        ),
      ),
    );
  }
}

class _VistaPregunta extends StatelessWidget {
  const _VistaPregunta({
    super.key,
    required this.eje,
    required this.prueba,
    required this.indice,
    required this.orden,
    required this.elegida,
    required this.alResponder,
    required this.alSeguir,
  });

  final Eje eje;
  final Prueba prueba;
  final int indice;
  final List<int> orden;
  final int? elegida;
  final ValueChanged<int> alResponder;
  final VoidCallback alSeguir;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final p = prueba.preguntas[indice];
    final total = prueba.preguntas.length;
    final respondida = elegida != null;
    final acerto = elegida == p.correcta;
    final ultima = indice == total - 1;

    return ListView(
      padding: const EdgeInsets.only(bottom: Esp.xxl),
      children: [
        Marco(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Esp.l, Esp.s, Esp.l, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Progreso(actual: indice, total: total, color: eje.color),
                const SizedBox(height: Esp.s),
                Text('Pregunta ${indice + 1} de $total',
                    style: t.bodyMedium!.copyWith(color: Colores.textoSuave)),
                const SizedBox(height: Esp.xl),
                if (prueba.mitoVerdad)
                  Text('¿MITO O VERDAD?',
                      style: t.labelLarge!.copyWith(
                          color: eje.color, letterSpacing: 1.1, fontSize: 14)),
                if (prueba.mitoVerdad) const SizedBox(height: Esp.s),
                Semantics(
                  header: true,
                  child: Text(p.enunciado, style: Fuentes.titular(26)),
                ),
                const SizedBox(height: Esp.xl),
                if (prueba.mitoVerdad)
                  Row(
                    children: [
                      for (var k = 0; k < orden.length; k++) ...[
                        if (k > 0) const SizedBox(width: Esp.m),
                        Expanded(
                          child: _Opcion(
                            texto: p.opciones[orden[k]],
                            letra: null,
                            estado: _estado(orden[k], p),
                            color: eje.color,
                            centrada: true,
                            alPulsar: () => alResponder(orden[k]),
                          ),
                        ),
                      ],
                    ],
                  )
                else
                  for (var k = 0; k < orden.length; k++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Esp.m),
                      child: _Opcion(
                        texto: p.opciones[orden[k]],
                        letra: String.fromCharCode(97 + k),
                        estado: _estado(orden[k], p),
                        color: eje.color,
                        alPulsar: () => alResponder(orden[k]),
                      ),
                    ),
                if (respondida) ...[
                  const SizedBox(height: Esp.m),
                  _Explicacion(acerto: acerto, texto: p.explicacion),
                  const SizedBox(height: Esp.xl),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: eje.color),
                    onPressed: alSeguir,
                    icon: Icon(ultima
                        ? Icons.flag_rounded
                        : Icons.arrow_forward_rounded),
                    label: Text(ultima ? 'Ver resultado' : 'Siguiente pregunta'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  _EstadoOpcion _estado(int opcion, Pregunta p) {
    if (elegida == null) return _EstadoOpcion.libre;
    if (opcion == p.correcta) return _EstadoOpcion.correcta;
    if (opcion == elegida) return _EstadoOpcion.equivocada;
    return _EstadoOpcion.apagada;
  }
}

enum _EstadoOpcion { libre, correcta, equivocada, apagada }

class _Opcion extends StatelessWidget {
  const _Opcion({
    required this.texto,
    required this.letra,
    required this.estado,
    required this.color,
    required this.alPulsar,
    this.centrada = false,
  });

  final String texto;
  final String? letra;
  final _EstadoOpcion estado;
  final Color color;
  final VoidCallback alPulsar;
  final bool centrada;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final (Color fondo, Color borde, Color tinta, IconData? icono) =
        switch (estado) {
      _EstadoOpcion.libre => (Colores.superficie, Colores.borde, Colores.texto, null),
      _EstadoOpcion.correcta => (
          Colores.bienTinte,
          Colores.bien,
          Colores.bien,
          Icons.check_circle_rounded
        ),
      _EstadoOpcion.equivocada => (
          Colores.alarmaTinte,
          Colores.alarma,
          Colores.alarma,
          Icons.cancel_rounded
        ),
      _EstadoOpcion.apagada => (
          Colores.superficie,
          Colores.borde,
          Colores.textoSuave,
          null
        ),
    };

    final insignia = icono != null
        ? Icon(icono, color: tinta, size: 28)
        : letra != null
            ? Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: estado == _EstadoOpcion.libre
                          ? color
                          : Colores.borde,
                      width: 2),
                ),
                child: Text(letra!,
                    style: t.labelLarge!.copyWith(
                        color: estado == _EstadoOpcion.libre
                            ? color
                            : Colores.textoSuave)),
              )
            : null;

    final etiquetaEstado = switch (estado) {
      _EstadoOpcion.correcta => ', respuesta correcta',
      _EstadoOpcion.equivocada => ', su respuesta, incorrecta',
      _ => '',
    };

    return Semantics(
      button: estado == _EstadoOpcion.libre,
      label: '$texto$etiquetaEstado',
      excludeSemantics: true,
      child: Material(
        color: fondo,
        borderRadius: BorderRadius.circular(Curva.boton + 2),
        child: InkWell(
          borderRadius: BorderRadius.circular(Curva.boton + 2),
          onTap: estado == _EstadoOpcion.libre ? alPulsar : null,
          child: Container(
            constraints: const BoxConstraints(minHeight: 60),
            padding: const EdgeInsets.symmetric(
                horizontal: Esp.l, vertical: Esp.m),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Curva.boton + 2),
              border: Border.all(
                  color: borde,
                  width: estado == _EstadoOpcion.libre ||
                          estado == _EstadoOpcion.apagada
                      ? 1.5
                      : 2.5),
            ),
            child: centrada
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (icono != null) ...[insignia!, const SizedBox(height: 4)],
                      Text(texto,
                          textAlign: TextAlign.center,
                          style: Fuentes.titular(22, color: tinta)),
                    ],
                  )
                : Row(
                    children: [
                      ?insignia,
                      const SizedBox(width: Esp.m),
                      Expanded(
                        child: Text(texto,
                            style: t.bodyLarge!.copyWith(
                                color: tinta, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class _Explicacion extends StatelessWidget {
  const _Explicacion({required this.acerto, required this.texto});

  final bool acerto;
  final String texto;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final color = acerto ? Colores.bien : Colores.alarma;
    return Container(
      padding: const EdgeInsets.all(Esp.l),
      decoration: BoxDecoration(
        color: acerto ? Colores.bienTinte : Colores.alarmaTinte,
        borderRadius: BorderRadius.circular(Curva.tarjeta - 4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(acerto ? Icons.celebration_rounded : Icons.info_rounded,
                  color: color),
              const SizedBox(width: Esp.s),
              Text(acerto ? '¡Correcto!' : 'No es así',
                  style: Fuentes.titular(21, color: color)),
            ],
          ),
          const SizedBox(height: Esp.s),
          Text(texto, style: t.bodyLarge),
        ],
      ),
    );
  }
}

class _Progreso extends StatelessWidget {
  const _Progreso(
      {required this.actual, required this.total, required this.color});

  final int actual;
  final int total;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Row(
        children: [
          for (var i = 0; i < total; i++) ...[
            if (i > 0) const SizedBox(width: 6),
            Expanded(
              child: Container(
                height: 6,
                decoration: BoxDecoration(
                  color: i <= actual ? color : Colores.borde,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Resultado extends StatelessWidget {
  const _Resultado({
    super.key,
    required this.eje,
    required this.aciertos,
    required this.total,
    required this.alReiniciar,
  });

  final Eje eje;
  final int aciertos;
  final int total;
  final VoidCallback alReiniciar;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final todas = aciertos == total;
    final mensaje = todas
        ? 'Sabe mucho de este tema. Compártalo con su familia.'
        : aciertos >= total / 2
            ? 'Va muy bien. Repase los temas y vuelva a intentarlo.'
            : 'Cada respuesta le enseñó algo. Lea los temas y vuelva a intentarlo.';
    return ListView(
      padding: const EdgeInsets.only(bottom: Esp.xxl),
      children: [
        Marco(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Esp.l, Esp.xl, Esp.l, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(Esp.xl),
                  decoration: BoxDecoration(
                    color: eje.tinte,
                    borderRadius: BorderRadius.circular(Curva.tarjeta),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        todas
                            ? Icons.emoji_events_rounded
                            : Icons.auto_stories_rounded,
                        color: eje.color,
                        size: 56,
                      ),
                      const SizedBox(height: Esp.m),
                      Semantics(
                        label: '$aciertos de $total respuestas correctas',
                        excludeSemantics: true,
                        child: Text.rich(
                          TextSpan(children: [
                            TextSpan(
                                text: '$aciertos',
                                style: Fuentes.titular(64,
                                    peso: 700, color: eje.color)),
                            TextSpan(
                                text: ' de $total',
                                style: Fuentes.titular(28,
                                    color: Colores.textoSuave)),
                          ]),
                        ),
                      ),
                      Text('respuestas correctas',
                          style: t.bodyLarge!
                              .copyWith(color: Colores.textoSuave)),
                      const SizedBox(height: Esp.l),
                      Text(mensaje,
                          textAlign: TextAlign.center,
                          style: Fuentes.titular(21)),
                    ],
                  ),
                ),
                const SizedBox(height: Esp.xl),
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: eje.color),
                  onPressed: alReiniciar,
                  icon: const Icon(Icons.replay_rounded),
                  label: const Text('Intentar de nuevo'),
                ),
                const SizedBox(height: Esp.m),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: eje.color,
                    side: BorderSide(color: eje.color, width: 1.5),
                  ),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.menu_book_outlined),
                  label: Text('Volver a ${eje.nombre}'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
