import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import '../tema.dart';
import 'datos_cap.dart';

const senalesNinez = [
  'Hinchazón en los dos pies, en las manos o en la cara.',
  'Está muy delgado, con los brazos y las costillas muy marcados.',
  'No quiere comer ni mamar.',
  'Está decaído, dormido todo el tiempo o no responde como siempre.',
  'Vomita todo lo que le dan.',
  'Diarrea que no para, o con sangre.',
  'Ojos hundidos, boca seca, llora sin lágrimas, orina poco (son señales de deshidratación).',
  'Dificultad para respirar o respiración muy rápida.',
  'Fiebre alta que no baja.',
  'Convulsiones (ataques).',
  'El cabello se le pone quebradizo, se le cae o le cambia de color.',
  'Dejó de subir de peso en los últimos controles.',
];

const ejeNinez = Eje(
  id: 'ninez',
  nombre: 'Niñez y nutrición',
  nombreLargo: 'Desnutrición infantil',
  lema:
      'Los primeros mil días deciden mucho. Conozca cómo alimentar y vigilar el crecimiento de su niño.',
  color: Colores.maiz,
  tinte: Colores.maizTinte,
  icono: Icons.child_care_rounded,
  porQueImporta: [
    Parrafo(
        'Guatemala ocupa el **primer lugar de América Latina y el Caribe** en desnutrición crónica en menores de cinco años, y el sexto a nivel mundial.'),
    Cifra('46.5%',
        'de los niños menores de cinco años tenía desnutrición crónica en el país (ENSMI 2014/2015).'),
    Parrafo(
        'Es mayor en el área rural (53%), en la región Norte —donde está Baja Verapaz— (50%), entre la niñez indígena (58%) y entre hijos de madres sin escolaridad (67%).'),
    Aviso(Tono.info,
        'La desnutrición crónica llega al **57%** entre hijos de madres con poco espacio entre embarazos. Planificar los embarazos es también prevenir la desnutrición.'),
    DatoCap('En Purulhá', DatosCap.datoLocalDesnutricion,
        icono: Icons.place_outlined),
  ],
  secciones: [
    Seccion(lecciones: [
      Leccion(
        id: 'ninez-tipos',
        titulo: 'Los dos tipos de desnutrición',
        resumen:
            'Diferencia entre desnutrición crónica (retraso en la talla) y aguda (pérdida rápida de peso).',
        icono: Icons.height_rounded,
        bloques: [
          Subtitulo('Desnutrición crónica: el niño no crece lo que debería'),
          Parrafo(
              'Ocurre cuando un niño no recibe suficiente alimento y salud durante mucho tiempo, sobre todo antes de los dos años. El niño se ve "pequeño para su edad": está bajo de talla.'),
          Parrafo(
              'Esta es la más común en Guatemala y la más difícil de notar, porque el niño puede verse "normal" si todos los niños de alrededor también están bajos. Por eso se le llama **invisible**.'),
          Aviso(Tono.cuidado,
              'Lo que se pierde en los primeros dos años no se recupera después. Afecta el crecimiento, la capacidad de aprender en la escuela y la salud de toda la vida adulta.'),
          Subtitulo('Desnutrición aguda: el niño baja de peso rápido'),
          Parrafo(
              'Ocurre cuando el niño pierde peso en poco tiempo, casi siempre por una enfermedad (diarrea, neumonía) o por falta repentina de comida. El niño se ve delgado, con los brazos muy flacos.'),
          Aviso(Tono.alarma,
              'Es menos frecuente, pero **es urgente**. La forma severa aumenta hasta nueve veces el riesgo de muerte. Se trata y se recupera, pero hay que llevar al niño al servicio de salud de inmediato.'),
        ],
      ),
      Leccion(
        id: 'ninez-mil-dias',
        titulo: 'La ventana de los mil días',
        resumen:
            'Qué son los primeros 1,000 días y por qué son la oportunidad más importante para prevenir la desnutrición.',
        icono: Icons.hourglass_bottom_rounded,
        bloques: [
          Parrafo(
              'Los primeros mil días van desde que la mujer queda embarazada hasta que el niño cumple dos años. Son **nueve meses de embarazo más dos años de vida**.'),
          Parrafo(
              'En ese tiempo el cuerpo y el cerebro del niño crecen más rápido que en cualquier otro momento de su vida. Lo que come y la salud que recibe en esos mil días decide qué tan sano y qué tan capaz será de adulto.'),
          Subtitulo('Lo que hay que hacer en cada etapa'),
          Tabla(['Etapa', 'Lo principal'], [
            [
              'Durante el embarazo',
              'Ir a los controles prenatales. Tomar el hierro y el ácido fólico que da el CAP. Comer variado.'
            ],
            [
              'Al nacer',
              'Poner al bebé al pecho en la primera hora de vida. Piel con piel.'
            ],
            [
              'De 0 a 6 meses',
              'Solo leche materna, de día y de noche, cada vez que el bebé pida. Nada más: ni agua, ni atol, ni té.'
            ],
            [
              'De 6 meses a 2 años',
              'Empezar a dar comida además del pecho. Seguir dando pecho hasta los dos años o más.'
            ],
            [
              'Todo el tiempo',
              'Vacunas completas, control de crecimiento en el CAP, agua segura y lavado de manos.'
            ],
          ]),
        ],
      ),
      Leccion(
        id: 'ninez-lactancia',
        titulo: 'Lactancia materna: los primeros seis meses',
        resumen: 'Por qué solo leche materna hasta los seis meses y cómo lograrlo.',
        icono: Icons.volunteer_activism_outlined,
        bloques: [
          Parrafo(
              'Hasta los seis meses, el bebé **solo necesita leche materna**. Nada más. Ni agua, ni té, ni atol, ni fórmula, ni suero. La leche materna ya trae toda el agua que el bebé necesita, incluso en tiempo de calor.'),
          Parrafo(
              'En Guatemala solo la mitad de los bebés recibe leche materna exclusiva hasta los seis meses. Muchos reciben otros líquidos desde el primer mes, y eso les quita defensas.'),
          Subtitulo('Cómo ayuda'),
          Lista([
            'Protege contra la diarrea y la neumonía, que son las que más provocan desnutrición aguda.',
            'Tiene todos los nutrientes en la medida exacta.',
            'No cuesta nada y siempre está lista y limpia.',
            'Ayuda a que la matriz de la madre vuelva a su tamaño y reduce el sangrado después del parto.',
          ]),
          Subtitulo('Consejos prácticos'),
          Lista([
            'Ponga al bebé al pecho en la **primera hora** después de nacer.',
            'Dele cada vez que pida, de día y de noche. Mientras más mama, más leche se produce.',
            'Evite pachas y pepes: hacen que el bebé succione distinto y luego le cueste agarrar el pecho, y hacen que baje la producción de leche.',
            'Si duele al dar de mamar, casi siempre es porque el bebé no está bien agarrado al pecho. Tiene arreglo: pida ayuda en el CAP o a la comadrona.',
            '"Tengo poca leche" casi nunca es cierto. Casi siempre se soluciona dando pecho más seguido. Consulte antes de dar fórmula.',
          ]),
          Aviso(Tono.consejo,
              'La madre que da pecho necesita comer bien y tomar bastante agua.'),
        ],
      ),
      Leccion(
        id: 'ninez-comida',
        titulo: 'De los 6 meses a los 2 años: la comida que acompaña al pecho',
        resumen: 'Cómo introducir alimentos a partir de los seis meses.',
        icono: Icons.soup_kitchen_outlined,
        bloques: [
          Parrafo(
              'A los seis meses el bebé ya necesita más de lo que la leche sola puede darle. Pero la leche materna sigue: **hasta los dos años o más**.'),
          Subtitulo('Por edades'),
          Tabla(['Edad', 'Consistencia', 'Cuántas veces al día', 'Cuánto'], [
            [
              '6 a 8 meses',
              'Purés espesos, machacado',
              '2 a 3 comidas',
              'Empezar con 2-3 cucharadas e ir subiendo'
            ],
            [
              '9 a 11 meses',
              'Picado fino, trocitos suaves',
              '3 a 4 comidas + 1 refacción',
              'Media taza por comida'
            ],
            [
              '12 a 24 meses',
              'La comida de la familia, picada',
              '3 a 4 comidas + 2 refacciones',
              'Tres cuartos de taza a una taza'
            ],
          ]),
          Aviso(Tono.consejo,
              'Para que la comida alimente de verdad: **que sea espesa**. Un atol ralo o una sopa aguada llenan la panza pero no alimentan.',
              titulo: 'La regla más importante'),
          Subtitulo('Qué ponerle'),
          Lista([
            '**Base:** maíz, arroz, papa, plátano, güisquil, ayote.',
            '**Proteína, lo más importante:** huevo (se puede dar desde los 6 meses), frijol bien cocido y machacado sin cáscara, pollo, hígado o menudos (muy ricos en hierro), pescado, Incaparina.',
            '**Hierbas:** chipilín, macuy/hierbamora, bledo, bien cocidas y picadas. Son de lo más nutritivo.',
            '**Grasa:** una cucharadita de aceite en la comida del niño ayuda a que la comida tenga más energía.',
            '**Fruta:** banano, papaya, mango machacados.',
          ]),
          Subtitulo('Qué NO dar antes de los dos años'),
          Lista([
            'Gaseosas, jugos de bote, café, té.',
            'Churros, boquitas, golosinas.',
            'Sopas instantáneas y consomé en cubo.',
            'Miel antes del año.',
            'Sal y azúcar agregadas.',
          ]),
          Subtitulo('Consejos que hacen diferencia'),
          Lista([
            'Dele al niño su propio plato, para saber cuánto comió de verdad.',
            'Acompáñelo y anímelo con paciencia. Un niño pequeño se distrae.',
            'Si rechaza un alimento nuevo, ofrézcalo otro día. A veces hace falta ofrecerlo 8 o 10 veces.',
            'Cuando el niño está enfermo, comida y pecho más seguido, en porciones pequeñas. Y después de la enfermedad, una comida extra al día por dos semanas para recuperar.',
          ]),
        ],
      ),
      Leccion(
        id: 'ninez-crecimiento',
        titulo: 'El control de crecimiento',
        resumen: 'Por qué llevar al niño a pesar y tallar aunque esté sano.',
        icono: Icons.trending_up_rounded,
        bloques: [
          Parrafo(
              'En el CAP pesan y miden a su niño y anotan el resultado en su carné o ficha. Eso no es un trámite: es la forma de ver si está creciendo bien.'),
          Parrafo(
              'Un solo peso no dice mucho. Lo que importa es **la línea**: si el niño sube de peso y de talla mes con mes. Cuando esa línea se aplana o baja, se puede actuar a tiempo, antes de que haya desnutrición.'),
          Aviso(Tono.consejo,
              'Lleve a su niño **aunque esté sano**. Ese es justamente el punto: detectar el problema antes de que se vea.'),
          Parrafo(
              'Lleve también el carné de vacunas. Las vacunas previenen enfermedades que causan desnutrición.'),
          DatoCap('Control de crecimiento en el CAP',
              DatosCap.horarioControlCrecimiento,
              icono: Icons.schedule_rounded),
        ],
      ),
      Leccion(
        id: 'ninez-deteccion',
        titulo: 'Cómo se detecta la desnutrición aguda',
        resumen:
            'Qué es la cinta MUAC, qué significan sus colores y cómo se revisa el edema. Información para que la familia entienda el procedimiento.',
        icono: Icons.straighten_rounded,
        bloques: [
          Parrafo(
              'El personal de salud usa tres formas de detectar desnutrición aguda en niños de 6 meses a 5 años:'),
          Subtitulo('1. La cinta de colores (MUAC)'),
          Parrafo(
              'Es una cinta que se pone alrededor de la parte media del brazo del niño. Mide qué tan delgado está el brazo, que refleja la pérdida de músculo. Tiene tres colores:'),
          Tabla(['Color', 'Qué significa'], [
            ['Verde', 'El niño está bien.'],
            [
              'Amarillo',
              'Hay riesgo o desnutrición aguda moderada. Necesita seguimiento.'
            ],
            ['Rojo', 'Desnutrición aguda severa. Necesita atención inmediata.'],
          ]),
          Subtitulo('2. Peso y talla'),
          Parrafo(
              'Se compara el peso del niño con lo que debería pesar para su estatura.'),
          Subtitulo('3. La prueba del pie (edema)'),
          Parrafo(
              'El personal presiona con los dedos la parte de arriba de los dos pies del niño durante unos segundos. Si al quitar los dedos queda un hoyito hundido, hay edema.'),
          Aviso(Tono.alarma,
              'El edema en los dos pies es señal de **desnutrición aguda severa**, aunque el niño se vea "gordito". Esto confunde a muchas familias: un niño hinchado puede estar gravemente desnutrido.'),
          Aviso(Tono.info,
              'Estas mediciones las hace personal capacitado. Esta app le explica qué le van a hacer a su niño y por qué, no le enseña a diagnosticarlo usted.'),
        ],
      ),
      Leccion(
        id: 'ninez-alarma',
        titulo: 'Señales de alarma: niñez',
        resumen: 'Cuándo llevar a un niño al CAP sin esperar.',
        icono: Icons.warning_amber_rounded,
        esAlarma: true,
        bloques: [
          Parrafo('Lleve a su niño al CAP **de inmediato** si presenta:'),
          Senales(senalesNinez),
          Aviso(Tono.alarma,
              'No espere a la próxima cita. No use remedios caseros en lugar de ir. En desnutrición aguda severa, cada día cuenta.'),
          DatoCap('Atención de emergencias', DatosCap.horarioEmergencias,
              icono: Icons.schedule_rounded),
        ],
      ),
    ]),
  ],
  prueba: Prueba(
    id: 'prueba-ninez',
    titulo: 'Los primeros mil días',
    descripcion: 'Cinco preguntas básicas, cada una con su explicación.',
    preguntas: [
      Pregunta(
        enunciado: '¿Qué debe tomar un bebé de 3 meses?',
        opciones: ['Pecho y agüita', 'Solo leche materna', 'Pecho y atol'],
        correcta: 1,
        explicacion:
            'Hasta los 6 meses, solo leche materna. Ni siquiera agua: la leche ya la trae.',
      ),
      Pregunta(
        enunciado: '¿Hasta qué edad se recomienda dar pecho?',
        opciones: ['Hasta los 6 meses', 'Hasta el año', 'Hasta los 2 años o más'],
        correcta: 2,
        explicacion:
            'A los 6 meses se agrega comida, pero el pecho continúa hasta los 2 años o más.',
      ),
      Pregunta(
        enunciado: 'Un niño con los dos pies hinchados…',
        opciones: [
          'Está bien alimentado',
          'Puede tener desnutrición severa',
          'Solo caminó mucho'
        ],
        correcta: 1,
        explicacion:
            'El edema en ambos pies es señal de desnutrición aguda severa, aunque el niño se vea gordito.',
      ),
      Pregunta(
        enunciado: '¿Cuál alimenta más a un niño de 8 meses?',
        opciones: [
          'Atol ralo',
          'Puré espeso de frijol con huevo',
          'Caldo aguado'
        ],
        correcta: 1,
        explicacion:
            'Mientras más espesa la comida, más alimenta. Los líquidos llenan pero no nutren.',
      ),
      Pregunta(
        enunciado: '¿Cuándo hay que llevar al niño a pesar?',
        opciones: [
          'Solo si está enfermo',
          'En cada control, aunque esté sano',
          'Una vez al año'
        ],
        correcta: 1,
        explicacion:
            'El control detecta problemas antes de que se vean. Por eso se va estando sano.',
      ),
    ],
  ),
);
