import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import '../rutas.dart';
import '../tema.dart';
import '../widgets/bloques.dart';
import '../widgets/marco.dart';

class PantallaLeccion extends StatelessWidget {
  const PantallaLeccion({super.key, required this.eje, required this.leccion});

  final Eje eje;
  final Leccion leccion;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final color = leccion.esAlarma ? Colores.alarma : eje.color;
    final tinte = leccion.esAlarma ? Colores.alarmaTinte : eje.tinte;

    final todas = eje.lecciones.toList();
    final i = todas.indexWhere((l) => l.id == leccion.id);
    final siguiente = i >= 0 && i + 1 < todas.length ? todas[i + 1] : null;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colores.papel,
        titleSpacing: 0,
        title: Text(
          eje.nombre,
          style: t.titleMedium!.copyWith(color: eje.color),
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.only(bottom: Esp.xxl),
          children: [
            Marco(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Esp.l, Esp.s, Esp.l, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: leccion.esAlarma ? color : tinte,
                          borderRadius: BorderRadius.circular(Curva.boton),
                        ),
                        child: Icon(
                          leccion.icono,
                          size: 30,
                          color: leccion.esAlarma ? Colors.white : color,
                        ),
                      ),
                    ),
                    const SizedBox(height: Esp.l),
                    Semantics(
                      header: true,
                      child: Text(leccion.titulo,
                          style: Fuentes.titular(31,
                              color: leccion.esAlarma ? color : null)),
                    ),
                    const SizedBox(height: Esp.s),
                    Text(
                      leccion.resumen,
                      style: t.bodyLarge!.copyWith(
                        color: Colores.textoSuave,
                        fontSize: 18.5,
                      ),
                    ),
                    const SizedBox(height: Esp.l),
                    // Hilo del color del eje: separa la entrada del texto.
                    Row(
                      children: [
                        Container(width: 40, height: 4, color: color),
                        const SizedBox(width: 6),
                        Container(width: 8, height: 4, color: color),
                      ],
                    ),
                    const SizedBox(height: Esp.xl),
                    VistaBloques(bloques: leccion.bloques, color: color),
                  ],
                ),
              ),
            ),
            Marco(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Esp.l, Esp.l, Esp.l, 0),
                child: siguiente != null
                    ? _Siguiente(
                        etiqueta: 'Siguiente tema',
                        titulo: siguiente.titulo,
                        color: siguiente.esAlarma ? Colores.alarma : eje.color,
                        tinte: siguiente.esAlarma
                            ? Colores.alarmaTinte
                            : eje.tinte,
                        icono: siguiente.icono,
                        ruta: Rutas.leccion(siguiente.id),
                      )
                    : _Siguiente(
                        etiqueta: 'Ya leyó todos los temas',
                        titulo: 'Haga la prueba: ${eje.prueba.titulo}',
                        color: eje.color,
                        tinte: eje.tinte,
                        icono: Icons.quiz_outlined,
                        ruta: Rutas.prueba(eje.prueba.id),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Siguiente extends StatelessWidget {
  const _Siguiente({
    required this.etiqueta,
    required this.titulo,
    required this.color,
    required this.tinte,
    required this.icono,
    required this.ruta,
  });

  final String etiqueta;
  final String titulo;
  final Color color;
  final Color tinte;
  final IconData icono;
  final String ruta;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Material(
      color: tinte,
      borderRadius: BorderRadius.circular(Curva.tarjeta),
      child: InkWell(
        borderRadius: BorderRadius.circular(Curva.tarjeta),
        // Reemplaza en vez de apilar: leer diez temas seguidos no debería
        // dejar diez pantallas detrás del botón de volver.
        onTap: () => Navigator.pushReplacementNamed(context, ruta),
        child: Padding(
          padding: const EdgeInsets.all(Esp.l),
          child: Row(
            children: [
              Icon(icono, color: color, size: 28),
              const SizedBox(width: Esp.m),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(etiqueta.toUpperCase(),
                        style: t.labelSmall!.copyWith(
                          color: color,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.9,
                        )),
                    const SizedBox(height: 2),
                    Text(titulo, style: t.titleMedium),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_rounded, color: color),
            ],
          ),
        ),
      ),
    );
  }
}
