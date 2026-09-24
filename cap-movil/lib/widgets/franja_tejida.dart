import 'package:flutter/material.dart';

import '../tema.dart';

/// Franja inspirada en las fajas tejidas de la región.
///
/// Es el único adorno de la app y aparece solo en las portadas: una hilera de
/// rombos entre dos bandas de zigzag, con los colores de los tres ejes. Se
/// dibuja con código —no es una imagen— para que se vea nítida en cualquier
/// pantalla y no pese nada.
class FranjaTejida extends StatelessWidget {
  const FranjaTejida({super.key, this.alto = 26, this.fondo = Colores.marca});

  final double alto;
  final Color fondo;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        height: alto,
        width: double.infinity,
        child: CustomPaint(painter: _Tejido(fondo)),
      ),
    );
  }
}

class _Tejido extends CustomPainter {
  _Tejido(this.fondo);

  final Color fondo;

  static const _rombos = [
    Colores.maizVivo,
    Color(0xFFE0578F), // fucsia vivo
    Color(0xFF6F8FDB), // añil vivo
    Colores.maizVivo,
    Color(0xFFF2EBDD),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final h = size.height;
    canvas.drawRect(Offset.zero & size, Paint()..color = fondo);

    // Zigzag arriba y abajo, en hilo claro.
    final hilo = Paint()
      ..color = const Color(0xFFF2EBDD).withValues(alpha: 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = h * 0.07;
    final paso = h * 0.5;
    for (final y in [h * 0.12, h * 0.88]) {
      final p = Path()..moveTo(0, y);
      var arriba = true;
      for (double x = 0; x <= size.width + paso; x += paso / 2) {
        p.lineTo(x, y + (arriba ? -h * 0.07 : h * 0.07));
        arriba = !arriba;
      }
      canvas.drawPath(p, hilo);
    }

    // Hilera de rombos, alternando color, con un punto al centro.
    final ancho = h * 0.9;
    final cy = h / 2;
    final r = h * 0.3;
    var i = 0;
    for (double cx = ancho / 2; cx < size.width + ancho; cx += ancho) {
      final rombo = Path()
        ..moveTo(cx, cy - r)
        ..lineTo(cx + r, cy)
        ..lineTo(cx, cy + r)
        ..lineTo(cx - r, cy)
        ..close();
      canvas.drawPath(rombo, Paint()..color = _rombos[i % _rombos.length]);
      canvas.drawCircle(Offset(cx, cy), r * 0.28, Paint()..color = fondo);
      // Puntada entre rombos.
      canvas.drawCircle(
        Offset(cx + ancho / 2, cy),
        h * 0.05,
        Paint()..color = const Color(0xFFF2EBDD),
      );
      i++;
    }
  }

  @override
  bool shouldRepaint(_Tejido old) => old.fondo != fondo;
}
