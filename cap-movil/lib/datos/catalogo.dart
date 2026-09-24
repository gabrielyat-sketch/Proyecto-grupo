import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import 'eje_embarazo.dart';
import 'eje_ninez.dart';
import 'eje_presion.dart';

const ejes = [ejePresion, ejeNinez, ejeEmbarazo];

/// La pantalla de alarmas junta las listas de todos los ejes: quien la abre
/// tiene prisa y no va a buscar en qué tema estaba cada señal.
const gruposAlarma = [
  GrupoAlarma(
    titulo: 'Embarazo',
    quien: 'Para la mujer embarazada',
    icono: Icons.pregnant_woman_rounded,
    senales: senalesEmbarazo,
    leccionId: 'emb-alarma',
  ),
  GrupoAlarma(
    titulo: 'Después del parto',
    quien: 'Para la madre',
    icono: Icons.woman_rounded,
    senales: senalesPosparto,
    leccionId: 'emb-posparto',
  ),
  GrupoAlarma(
    titulo: 'Recién nacido',
    quien: 'Para el bebé en sus primeros días',
    icono: Icons.child_friendly_rounded,
    senales: senalesRecienNacido,
    leccionId: 'emb-posparto',
  ),
  GrupoAlarma(
    titulo: 'Niñez',
    quien: 'Para niñas y niños',
    icono: Icons.child_care_rounded,
    senales: senalesNinez,
    leccionId: 'ninez-alarma',
  ),
  GrupoAlarma(
    titulo: 'Presión alta',
    quien: 'Para personas con presión alta',
    icono: Icons.favorite_rounded,
    senales: senalesPresion,
    leccionId: 'presion-alarma',
  ),
];

Eje? ejePorId(String id) {
  for (final e in ejes) {
    if (e.id == id) return e;
  }
  return null;
}

/// La lección y el eje al que pertenece.
(Eje, Leccion)? leccionPorId(String id) {
  for (final e in ejes) {
    for (final l in e.lecciones) {
      if (l.id == id) return (e, l);
    }
  }
  return null;
}

(Eje, Prueba)? pruebaPorId(String id) {
  for (final e in ejes) {
    if (e.prueba.id == id) return (e, e.prueba);
  }
  return null;
}
