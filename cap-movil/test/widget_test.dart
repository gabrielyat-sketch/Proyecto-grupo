import 'package:cap_movil/datos/catalogo.dart';
import 'package:cap_movil/main.dart';
import 'package:cap_movil/modelo/contenido.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('contenido', () {
    test('los ids de lecciones y pruebas no se repiten', () {
      final ids = [
        for (final e in ejes) ...[
          ...e.lecciones.map((l) => l.id),
          e.prueba.id,
        ],
      ];
      expect(ids.toSet().length, ids.length);
    });

    test('cada respuesta correcta apunta a una opción que existe', () {
      for (final e in ejes) {
        for (final p in e.prueba.preguntas) {
          expect(p.correcta, inInclusiveRange(0, p.opciones.length - 1),
              reason: p.enunciado);
        }
      }
    });

    test('las alarmas apuntan a lecciones que existen', () {
      for (final g in gruposAlarma) {
        expect(leccionPorId(g.leccionId), isNotNull, reason: g.titulo);
      }
    });

    test('ningún texto quedó con [LLENAR CAP] ni negritas sin cerrar', () {
      Iterable<String> textos(Bloque b) => switch (b) {
            Parrafo(:final texto) => [texto],
            Subtitulo(:final texto) => [texto],
            Lista(:final items) => items,
            Tabla(:final filas) => filas.expand((f) => f),
            Aviso(:final texto) => [texto],
            Senales(:final items) => items,
            Cifra(:final texto) => [texto],
            DatoCap() => const [],
          };
      for (final e in ejes) {
        final bloques = [
          ...e.porQueImporta,
          ...e.lecciones.expand((l) => l.bloques),
        ];
        for (final t in bloques.expand(textos)) {
          expect(t.contains('LLENAR'), isFalse, reason: t);
          expect('**'.allMatches(t).length.isEven, isTrue, reason: t);
        }
      }
    });
  });

  group('pantallas', () {
    /// Tamaño de un celular Android común (412 × 915 dp).
    Future<void> abrirApp(WidgetTester tester) async {
      tester.view.physicalSize = const Size(412 * 3, 915 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(const AppCap());
    }

    Future<void> tocar(WidgetTester tester, Finder f) async {
      await tester.ensureVisible(f);
      await tester.pumpAndSettle();
      await tester.tap(f);
      await tester.pumpAndSettle();
    }

    testWidgets('el inicio muestra los tres ejes y las alarmas',
        (tester) async {
      await abrirApp(tester);
      expect(find.text('Señales de alarma'), findsOneWidget);
      for (final e in ejes) {
        await tester.scrollUntilVisible(find.text(e.nombre), 200,
            scrollable: find.byType(Scrollable).first);
        expect(find.text(e.nombre), findsOneWidget);
      }
    });

    testWidgets('abrir un eje y una lección', (tester) async {
      await abrirApp(tester);
      await tocar(tester, find.text('Niñez y nutrición'));
      await tocar(tester, find.text('La ventana de los mil días'));
      expect(find.textContaining('nueve meses de embarazo', findRichText: true),
          findsOneWidget);
    });

    testWidgets('una prueba se puede responder hasta el resultado',
        (tester) async {
      await abrirApp(tester);
      tester.state<NavigatorState>(find.byType(Navigator))
          .pushNamed('/prueba/prueba-embarazo');
      await tester.pumpAndSettle();

      final prueba = pruebaPorId('prueba-embarazo')!.$2;
      for (var i = 0; i < prueba.preguntas.length; i++) {
        await tocar(tester, find.text('Mito').first);
        await tocar(
            tester,
            find.text(i == prueba.preguntas.length - 1
                ? 'Ver resultado'
                : 'Siguiente pregunta'));
      }
      expect(find.text('respuestas correctas'), findsOneWidget);
      // Tres de las seis son mito: elegir siempre "Mito" acierta tres.
      expect(find.text('3 de 6', findRichText: true), findsOneWidget);
    });

    testWidgets('las alarmas se abren y llevan al tema', (tester) async {
      await abrirApp(tester);
      await tocar(tester, find.text('Señales de alarma'));
      await tocar(tester, find.text('Embarazo'));
      expect(find.text('Ver lucecitas, manchas o borroso.'), findsOneWidget);
      await tocar(tester, find.text('Leer el tema completo').first);
      expect(find.text('Señales de peligro en el embarazo'), findsOneWidget);
    });

    testWidgets('una dirección que no existe no revienta', (tester) async {
      await abrirApp(tester);
      tester.state<NavigatorState>(find.byType(Navigator))
          .pushNamed('/leccion/no-existe');
      await tester.pumpAndSettle();
      expect(find.text('No encontramos esa página'), findsOneWidget);
    });
  });
}
