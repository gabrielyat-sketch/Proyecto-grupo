import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import '../tema.dart';
import '../widgets/bloques.dart';
import '../widgets/franja_tejida.dart';
import '../widgets/marco.dart';

class PantallaAcerca extends StatelessWidget {
  const PantallaAcerca({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colores.papel,
        titleSpacing: 0,
        title: const Text('Sobre esta app'),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: Esp.xxl),
        children: [
          Marco(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Esp.l, Esp.s, Esp.l, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Image.asset('assets/imagenes/logo.png',
                        width: 112, semanticLabel: 'Logo del CAP'),
                  ),
                  const SizedBox(height: Esp.l),
                  Text('CAP Purulhá',
                      textAlign: TextAlign.center,
                      style: Fuentes.titular(30)),
                  Text('Centro de Atención Permanente · Baja Verapaz',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium!
                          .copyWith(color: Colores.textoSuave)),
                  const SizedBox(height: Esp.xl),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(Curva.chip),
                    child: const FranjaTejida(alto: 14),
                  ),
                  const SizedBox(height: Esp.xl),
                  const VistaBloques(color: Colores.marca, bloques: [
                    Parrafo(
                        'Esta app reúne información de salud preparada por el personal del CAP de Purulhá sobre tres temas: **presión alta**, **nutrición de la niñez** y **embarazo saludable**, con planificación familiar y prevención del embarazo en adolescentes.'),
                    Aviso(Tono.cuidado,
                        'Esta app le informa; **no diagnostica ni indica medicamentos**. Quien decide su tratamiento es el personal de salud que lo atiende.',
                        titulo: 'Importante'),
                    Subtitulo('Su privacidad'),
                    Lista([
                      'No pide su nombre ni ningún dato suyo.',
                      'No tiene cuentas ni contraseñas.',
                      'No guarda nada de lo que usted lee ni de sus respuestas en las pruebas.',
                      'Funciona sin internet: toda la información ya viene dentro de la app.',
                    ]),
                    Subtitulo('Fuentes'),
                    Parrafo(
                        'Los contenidos se basan en las guías del Ministerio de Salud Pública y Asistencia Social (MSPAS), la OPS y la OMS, la ENSMI 2014/2015, el OSAR y la legislación de Guatemala (Decretos 32-2010 y 87-2005).'),
                  ]),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
