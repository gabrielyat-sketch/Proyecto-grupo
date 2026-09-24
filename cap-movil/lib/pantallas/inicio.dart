import 'package:flutter/material.dart';

import '../datos/catalogo.dart';
import '../modelo/contenido.dart';
import '../rutas.dart';
import '../tema.dart';
import '../widgets/franja_tejida.dart';
import '../widgets/marco.dart';

class PantallaInicio extends StatelessWidget {
  const PantallaInicio({super.key});

  String _saludo(DateTime ahora) {
    final h = ahora.hour;
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _Encabezado(saludo: _saludo(DateTime.now()))),
          SliverToBoxAdapter(
            child: Marco(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Esp.l, Esp.xl, Esp.l, 0),
                child: const _BotonAlarmas(),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Marco(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Esp.l, Esp.xxl, Esp.l, Esp.m),
                child: Semantics(
                  header: true,
                  child: Text('¿Qué quiere aprender hoy?',
                      style: Fuentes.titular(24)),
                ),
              ),
            ),
          ),
          SliverList.list(children: [
            for (final eje in ejes)
              Marco(
                child: Padding(
                  padding:
                      const EdgeInsets.fromLTRB(Esp.l, 0, Esp.l, Esp.m),
                  child: _TarjetaEje(eje),
                ),
              ),
          ]),
          SliverToBoxAdapter(
            child: Marco(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                    Esp.l, Esp.l, Esp.l, Esp.xxl + Esp.l),
                child: Column(
                  children: [
                    Text(
                      'Esta app le informa; no reemplaza la consulta.\nQuien diagnostica es el personal de salud.',
                      textAlign: TextAlign.center,
                      style: t.bodyMedium!.copyWith(color: Colores.textoSuave),
                    ),
                    const SizedBox(height: Esp.s),
                    TextButton.icon(
                      onPressed: () =>
                          Navigator.pushNamed(context, Rutas.acerca),
                      icon: const Icon(Icons.info_outline_rounded),
                      label: const Text('Sobre esta app'),
                      style: TextButton.styleFrom(
                        foregroundColor: Colores.marca,
                        minimumSize: const Size(48, 48),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Encabezado extends StatelessWidget {
  const _Encabezado({required this.saludo});

  final String saludo;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final arriba = MediaQuery.paddingOf(context).top;
    return Container(
      color: Colores.marca,
      child: Column(
        children: [
          Marco(
            child: Padding(
              padding: EdgeInsets.fromLTRB(Esp.l, arriba + Esp.xl, Esp.l, Esp.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        padding: const EdgeInsets.all(5),
                        decoration: const BoxDecoration(
                          color: Colores.papel,
                          shape: BoxShape.circle,
                        ),
                        child: Image.asset('assets/imagenes/logo.png',
                            semanticLabel: 'Logo del CAP'),
                      ),
                      const SizedBox(width: Esp.m),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('CAP Purulhá',
                              style: t.titleMedium!
                                  .copyWith(color: Colors.white)),
                          Text('Baja Verapaz',
                              style: t.bodyMedium!.copyWith(
                                  color: Colors.white.withValues(alpha: 0.78))),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: Esp.xxl),
                  Text(saludo,
                      style: Fuentes.titular(38, color: Colors.white)),
                  const SizedBox(height: Esp.s),
                  Text(
                    'Información de salud para usted y su familia, del Centro de Atención Permanente.',
                    style: t.bodyLarge!.copyWith(
                        color: Colors.white.withValues(alpha: 0.88)),
                  ),
                ],
              ),
            ),
          ),
          const FranjaTejida(),
        ],
      ),
    );
  }
}

/// El acceso a las alarmas va arriba de todo y en rojo: es lo único de la app
/// que alguien puede necesitar con prisa.
class _BotonAlarmas extends StatelessWidget {
  const _BotonAlarmas();

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Material(
      color: Colores.alarma,
      borderRadius: BorderRadius.circular(Curva.tarjeta),
      child: InkWell(
        borderRadius: BorderRadius.circular(Curva.tarjeta),
        onTap: () => Navigator.pushNamed(context, Rutas.alarmas),
        child: Padding(
          padding: const EdgeInsets.all(Esp.l),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.warning_amber_rounded,
                    color: Colors.white, size: 30),
              ),
              const SizedBox(width: Esp.l),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Señales de alarma',
                        style: Fuentes.titular(21, color: Colors.white)),
                    const SizedBox(height: 2),
                    Text('Cuándo ir al CAP de inmediato',
                        style: t.bodyMedium!.copyWith(color: Colors.white)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: Colors.white, size: 30),
            ],
          ),
        ),
      ),
    );
  }
}

class _TarjetaEje extends StatelessWidget {
  const _TarjetaEje(this.eje);

  final Eje eje;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final temas = eje.lecciones.length;
    return Material(
      color: Colores.superficie,
      borderRadius: BorderRadius.circular(Curva.tarjeta),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.pushNamed(context, Rutas.eje(eje.id)),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Curva.tarjeta),
            border: Border.all(color: Colores.borde),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 92,
                  color: eje.tinte,
                  alignment: Alignment.center,
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration:
                        BoxDecoration(color: eje.color, shape: BoxShape.circle),
                    child: Icon(eje.icono, color: Colors.white, size: 30),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                        Esp.l, Esp.l, Esp.s, Esp.l),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(eje.nombre, style: Fuentes.titular(22)),
                        const SizedBox(height: Esp.xs),
                        Text(
                          eje.nombreLargo,
                          style: t.bodyMedium!
                              .copyWith(color: Colores.textoSuave),
                        ),
                        const SizedBox(height: Esp.s),
                        Text(
                          '$temas temas · 1 prueba',
                          style: t.labelLarge!.copyWith(
                              color: eje.color, fontSize: 14.5),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: Esp.s),
                  child: Icon(Icons.chevron_right_rounded,
                      color: eje.color, size: 28),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
