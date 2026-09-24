/// Datos que el documento del CAP dejó marcados como [LLENAR CAP].
///
/// Mientras un valor sea `null`, la app no lo muestra: un horario o un teléfono
/// inventado es peor que ninguno. Cuando el CAP los confirme, basta con
/// escribirlos aquí; no hay que tocar ninguna pantalla.
abstract final class DatosCap {
  /// Eje 2 · dato local de desnutrición en Purulhá o Baja Verapaz.
  static const String? datoLocalDesnutricion = null;

  /// Eje 2 · días y horarios de control de crecimiento.
  static const String? horarioControlCrecimiento = null;

  /// Eje 3 · semanas exactas de la segunda y tercera atención prenatal según
  /// la norma que maneja el CAP. Si se llena, reemplaza el texto general.
  static const String? semanasControlPrenatal = null;

  /// Eje 3 · días y horarios de consejería en planificación familiar.
  static const String? horarioPlanificacion = null;

  /// Eje 3 · métodos disponibles actualmente en el CAP.
  static const String? metodosDisponibles = null;

  /// Eje 3 · números de denuncia verificados (nacionales y locales).
  static const String? numerosDenuncia = null;

  /// Eje 3 · dirección del MP o juzgado más cercano a Purulhá.
  static const String? direccionDenuncia = null;

  /// Eje 3 · persona de contacto en el CAP para casos de violencia sexual.
  static const String? contactoCasosCap = null;

  /// Eje 3 · espacio o día de atención diferenciada para adolescentes.
  static const String? atencionAdolescentes = null;

  /// Eje 1 · la cifra de "Por qué importa" venía marcada (VERIFICAR DATOS).
  /// Queda oculta hasta que alguien la confirme; pasar a `true` la muestra.
  static const bool cifrasPresionVerificadas = false;

  /// Atención de emergencias. Este sí viene confirmado en el documento.
  static const String horarioEmergencias = '24 horas';
}
