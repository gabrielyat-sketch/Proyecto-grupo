import 'package:flutter/material.dart';

import '../datos/catalogo.dart';
import '../datos/datos_cap.dart';
import '../modelo/contenido.dart';
import '../rutas.dart';
import '../tema.dart';
import '../widgets/bloques.dart';
import '../widgets/marco.dart';

/// Todas las señales de alarma en un solo lugar.
///
/// Quien llega aquí tiene prisa: primero va qué hacer (ir ya al CAP) y luego
/// las listas, agrupadas por la persona que tiene el problema, que es lo que
/// uno sabe en ese momento.
class PantallaAlarmas extends StatelessWidget {
  const PantallaAlarmas({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final arriba = MediaQuery.paddingOf(context).top;
    return Scaffold(
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          Container(
            color: Colores.alarma,
            child: Marco(
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
                          const Icon(Icons.warning_amber_rounded,
                              color: Colors.white, size: 44),
                          const SizedBox(height: Esp.m),
                          Semantics(
                            header: true,
                            child: Text('Señales de alarma',
                                style: Fuentes.titular(34,
                                    color: Colors.white)),
                          ),
                          const SizedBox(height: Esp.m),
                          Text(
                            'Si ve cualquiera de estas señales, vaya al CAP o a la emergencia más cercana de inmediato, a cualquier hora.',
                            style: t.bodyLarge!.copyWith(color: Colors.white),
                          ),
                          const SizedBox(height: Esp.l),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: Esp.m, vertical: Esp.s),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(Curva.chip),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.schedule_rounded,
                                    color: Colores.alarma, size: 20),
                                const SizedBox(width: Esp.s),
                                Flexible(
                                  child: Text(
                                    'Emergencias: ${DatosCap.horarioEmergencias}',
                                    style: t.labelLarge!
                                        .copyWith(color: Colores.alarma),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Marco(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Esp.l, Esp.xl, Esp.l, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('¿Para quién es?', style: Fuentes.titular(22)),
                  const SizedBox(height: Esp.m),
                  for (final g in gruposAlarma)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Esp.m),
                      child: _Grupo(g),
                    ),
                  const SizedBox(height: Esp.s),
                  const AvisoVista(Aviso(
                    Tono.alarma,
                    'No espere a que se le pase ni al día siguiente. No se automedique ni use remedios caseros en lugar de ir. Si puede, que alguien lo acompañe.',
                  )),
                  SizedBox(
                      height: Esp.xxl + MediaQuery.paddingOf(context).bottom),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Grupo extends StatelessWidget {
  const _Grupo(this.grupo);

  final GrupoAlarma grupo;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    // Material y no Container: el ExpansionTile pinta el toque sobre el
    // Material más cercano, y un Container con color lo taparía.
    return Material(
      color: Colores.superficie,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Curva.tarjeta),
        side: const BorderSide(color: Colores.borde),
      ),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding:
              const EdgeInsets.symmetric(horizontal: Esp.l, vertical: Esp.xs),
          childrenPadding: const EdgeInsets.fromLTRB(Esp.m, 0, Esp.m, Esp.m),
          iconColor: Colores.alarma,
          collapsedIconColor: Colores.alarma,
          leading: Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: Colores.alarmaTinte,
              shape: BoxShape.circle,
            ),
            child: Icon(grupo.icono, color: Colores.alarma),
          ),
          title: Text(grupo.titulo, style: t.titleMedium),
          subtitle: Text(
            '${grupo.quien} · ${grupo.senales.length} señales',
            style: t.bodyMedium!.copyWith(color: Colores.textoSuave),
          ),
          children: [
            SenalesVista(items: grupo.senales),
            const SizedBox(height: Esp.s),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: Colores.alarma,
                  minimumSize: const Size(48, 48),
                ),
                onPressed: () => Navigator.pushNamed(
                    context, Rutas.leccion(grupo.leccionId)),
                icon: const Icon(Icons.menu_book_outlined),
                label: const Text('Leer el tema completo'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
