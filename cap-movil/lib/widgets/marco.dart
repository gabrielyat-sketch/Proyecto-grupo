import 'package:flutter/material.dart';

/// Limita el ancho de lectura a 640 y lo centra.
///
/// En un celular no cambia nada; en una tablet evita renglones de lado a lado
/// de la pantalla, que se pierden al pasar de uno al siguiente.
class Marco extends StatelessWidget {
  const Marco({super.key, required this.child});

  final Widget child;

  static const anchoMaximo = 640.0;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: anchoMaximo),
        // Ocupa todo el ancho disponible: sin esto Center encoge al hijo y un
        // título corto queda centrado en vez de alineado a la izquierda.
        child: SizedBox(width: double.infinity, child: child),
      ),
    );
  }
}
