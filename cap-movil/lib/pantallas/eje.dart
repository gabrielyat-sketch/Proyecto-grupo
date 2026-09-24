import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import '../rutas.dart';
import '../tema.dart';
import '../widgets/bloques.dart';
import '../widgets/franja_tejida.dart';
import '../widgets/marco.dart';

class PantallaEje extends StatelessWidget {
  const PantallaEje({super.key, required this.eje});

  final Eje eje;

  @override
  Widget build(BuildContext context) {
    var numero = 0;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _Portada(eje)),
          if (eje.porQueImporta.isNotEmpty)
            SliverToBoxAdapter(
              child: Marco(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Esp.l, Esp.xl, Esp.l, 0),
                  child: _PorQueImporta(eje),
                ),
              ),
            ),
          for (final seccion in eje.secciones) ...[
            SliverToBoxAdapter(
              child: Marco(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                      Esp.l, Esp.xxl, Esp.l, Esp.m),
                  child: Semantics(
                    header: true,
                    child: Text(seccion.titulo ?? 'Temas',
                        style: Fuentes.titular(24)),
                  ),
                ),
              ),
            ),
            SliverList.list(children: [
              for (final l in seccion.lecciones)
                Marco(
                  child: Padding(
                    padding:
                        const EdgeInsets.fromLTRB(Esp.l, 0, Esp.l, Esp.s),
                    child: _FilaLeccion(
                      eje: eje,
                      leccion: l,
                      numero: l.esAlarma ? null : ++numero,
                    ),
                  ),
                ),
            ]),
          ],
          SliverToBoxAdapter(
            child: Marco(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                    Esp.l, Esp.xl, Esp.l, Esp.xxl + Esp.l),
                child: _TarjetaPrueba(eje: eje),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(height: MediaQuery.paddingOf(context).bottom),
          ),
        ],
      ),
    );
  }
}

class _Portada extends StatelessWidget {
  const _Portada(this.eje);

  final Eje eje;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final arriba = MediaQuery.paddingOf(context).top;
    return Container(
      color: eje.color,
      child: Column(
        children: [
          Marco(
            child: Padding(
              padding:
                  EdgeInsets.fromLTRB(Esp.s, arriba + Esp.s, Esp.l, Esp.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const BackButton(color: Colors.white),
                  Padding(
                    padding: const EdgeInsets.only(left: Esp.s),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: Esp.s),
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            shape: BoxShape.circle,
                          ),
                          child:
                              Icon(eje.icono, color: Colors.white, size: 32),
                        ),
                        const SizedBox(height: Esp.l),
                        Text(
                          eje.nombreLargo.toUpperCase(),
                          style: t.labelLarge!.copyWith(
                            color: Colors.white.withValues(alpha: 0.85),
                            letterSpacing: 1.2,
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(height: Esp.xs),
                        Semantics(
                          header: true,
                          child: Text(eje.nombre,
                              style: Fuentes.titular(36, color: Colors.white)),
                        ),
                        const SizedBox(height: Esp.m),
                        Text(
                          eje.lema,
                          style: t.bodyLarge!.copyWith(
                            color: Colors.white.withValues(alpha: 0.92),
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          FranjaTejida(alto: 18, fondo: eje.color),
        ],
      ),
    );
  }
}

class _PorQueImporta extends StatelessWidget {
  const _PorQueImporta(this.eje);

  final Eje eje;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: eje.tinte,
      borderRadius: BorderRadius.circular(Curva.tarjeta),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        // Sin las líneas que ExpansionTile dibuja al abrirse.
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.fromLTRB(Esp.l, Esp.xs, Esp.m, Esp.xs),
          childrenPadding: const EdgeInsets.fromLTRB(Esp.l, 0, Esp.l, Esp.s),
          iconColor: eje.color,
          collapsedIconColor: eje.color,
          leading: Icon(Icons.public_rounded, color: eje.color),
          title: Text('Por qué importa en Guatemala',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium!
                  .copyWith(color: eje.color)),
          children: [VistaBloques(bloques: eje.porQueImporta, color: eje.color)],
        ),
      ),
    );
  }
}

class _FilaLeccion extends StatelessWidget {
  const _FilaLeccion({required this.eje, required this.leccion, this.numero});

  final Eje eje;
  final Leccion leccion;
  final int? numero;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final alarma = leccion.esAlarma;
    final color = alarma ? Colores.alarma : eje.color;
    return Material(
      color: alarma ? Colores.alarmaTinte : Colores.superficie,
      borderRadius: BorderRadius.circular(Curva.tarjeta - 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(Curva.tarjeta - 4),
        onTap: () => Navigator.pushNamed(context, Rutas.leccion(leccion.id)),
        child: Container(
          padding: const EdgeInsets.all(Esp.m),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Curva.tarjeta - 4),
            border: Border.all(
              color: alarma ? Colores.alarma : Colores.borde,
              width: alarma ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: alarma ? Colores.alarma : eje.tinte,
                  borderRadius: BorderRadius.circular(Curva.chip + 2),
                ),
                alignment: Alignment.center,
                child: alarma
                    ? const Icon(Icons.warning_amber_rounded,
                        color: Colors.white)
                    : Icon(leccion.icono, color: eje.color),
              ),
              const SizedBox(width: Esp.m),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (numero != null)
                      Text('TEMA $numero',
                          style: t.labelSmall!.copyWith(
                            color: color,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.9,
                          )),
                    Text(leccion.titulo,
                        style: t.titleMedium!.copyWith(
                            color: alarma ? Colores.alarma : null)),
                    const SizedBox(height: 2),
                    Text(
                      leccion.resumen,
                      style:
                          t.bodyMedium!.copyWith(color: Colores.textoSuave),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: color),
            ],
          ),
        ),
      ),
    );
  }
}

class _TarjetaPrueba extends StatelessWidget {
  const _TarjetaPrueba({required this.eje});

  final Eje eje;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final prueba = eje.prueba;
    return Container(
      padding: const EdgeInsets.all(Esp.xl),
      decoration: BoxDecoration(
        color: Colores.marca,
        borderRadius: BorderRadius.circular(Curva.tarjeta),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.quiz_outlined, color: Colores.maizVivo),
              const SizedBox(width: Esp.s),
              Text('PONGA A PRUEBA LO QUE SABE',
                  style: t.labelSmall!.copyWith(
                    color: Colores.maizVivo,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  )),
            ],
          ),
          const SizedBox(height: Esp.m),
          Text(prueba.titulo, style: Fuentes.titular(24, color: Colors.white)),
          const SizedBox(height: Esp.xs),
          Text(prueba.descripcion,
              style: t.bodyLarge!
                  .copyWith(color: Colors.white.withValues(alpha: 0.88))),
          const SizedBox(height: Esp.l),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: Colores.papel,
              foregroundColor: Colores.marca,
            ),
            onPressed: () =>
                Navigator.pushNamed(context, Rutas.prueba(prueba.id)),
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Empezar'),
          ),
        ],
      ),
    );
  }
}
