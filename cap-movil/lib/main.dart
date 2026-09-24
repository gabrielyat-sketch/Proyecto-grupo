import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'rutas.dart';
import 'tema.dart';

void main() {
  runApp(const AppCap());
}

class AppCap extends StatelessWidget {
  const AppCap({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      // Íconos claros en la barra de estado: las portadas son de color oscuro.
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: Colores.papel,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: MaterialApp(
        title: 'CAP Purulhá',
        debugShowCheckedModeBanner: false,
        theme: crearTema(),
        locale: const Locale('es', 'GT'),
        initialRoute: Rutas.inicio,
        onGenerateRoute: Rutas.generar,
        builder: (context, child) {
          // Respeta la letra grande del teléfono, pero con tope: pasado 1.6×
          // los titulares de 36 ya no caben en 360 px.
          final mq = MediaQuery.of(context);
          return MediaQuery(
            data: mq.copyWith(
              textScaler: mq.textScaler.clamp(maxScaleFactor: 1.6),
            ),
            child: child!,
          );
        },
      ),
    );
  }
}
