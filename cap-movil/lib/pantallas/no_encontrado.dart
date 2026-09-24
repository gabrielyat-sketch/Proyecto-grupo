import 'package:flutter/material.dart';

import '../rutas.dart';
import '../tema.dart';

/// Solo se llega aquí por una dirección web mal escrita.
class PantallaNoEncontrado extends StatelessWidget {
  const PantallaNoEncontrado({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(Esp.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.travel_explore_rounded,
                    size: 56, color: Colores.marca),
                const SizedBox(height: Esp.l),
                Text('No encontramos esa página',
                    textAlign: TextAlign.center,
                    style: Fuentes.titular(26)),
                const SizedBox(height: Esp.s),
                Text('Puede que el tema haya cambiado de lugar.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .bodyLarge!
                        .copyWith(color: Colores.textoSuave)),
                const SizedBox(height: Esp.xl),
                FilledButton.icon(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(
                      context, Rutas.inicio, (_) => false),
                  icon: const Icon(Icons.home_rounded),
                  label: const Text('Ir al inicio'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
