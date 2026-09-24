import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import '../tema.dart';
import 'datos_cap.dart';

const senalesPresion = [
  'Dolor o presión fuerte en el pecho.',
  'Dificultad para respirar.',
  'Debilidad o adormecimiento de un lado del cuerpo: cara, brazo o pierna.',
  'Dificultad para hablar o boca torcida.',
  'Pérdida repentina de la visión o visión borrosa de golpe.',
  'Dolor de cabeza muy fuerte, distinto a los normales, que empieza de repente.',
  'Confusión o desmayo.',
  'Vómitos junto con dolor de cabeza fuerte.',
];

const ejePresion = Eje(
  id: 'presion',
  nombre: 'Presión alta',
  nombreLargo: 'Hipertensión arterial',
  lema:
      'La presión alta casi no se siente. Aprenda a detectarla, controlarla y comer mejor.',
  color: Colores.anil,
  tinte: Colores.anilTinte,
  icono: Icons.favorite_rounded,
  porQueImporta: DatosCap.cifrasPresionVerificadas
      ? [
          Parrafo(
              'La hipertensión es el principal factor de riesgo de muerte en el país según la guía del MSPAS. Las cifras de prevalencia varían entre fuentes: la OPS reportó 21.2% de personas de 18 años o más con presión elevada en 2015, mientras que el MSPAS ha advertido públicamente de un incremento sostenido desde 2022, sobre todo en mayores de 40 años.'),
          Cifra('30%',
              'de las muertes del país en 2022, aproximadamente, fueron por enfermedades cardiovasculares.'),
        ]
      : [],
  secciones: [
    Seccion(lecciones: [
      Leccion(
        id: 'presion-que-es',
        titulo: '¿Qué es la presión alta?',
        resumen:
            'La presión alta es cuando la sangre empuja con demasiada fuerza dentro de las venas. Casi nunca duele, por eso hay que medirla.',
        icono: Icons.water_drop_outlined,
        bloques: [
          Parrafo(
              'Su corazón bombea sangre a todo el cuerpo. Esa sangre empuja las paredes de las venas y arterias. A ese empuje se le llama **presión arterial**.'),
          Parrafo(
              'Cuando el empuje es demasiado fuerte todo el tiempo, se llama **presión alta** o **hipertensión**.'),
          Parrafo(
              'El problema es que la presión alta casi no se siente. Una persona puede tener presión alta durante años y sentirse bien. Mientras tanto, el empuje va dañando poco a poco el corazón, el cerebro, los riñones y los ojos.'),
          Aviso(Tono.info,
              'Por eso se le dice **"la enfermedad silenciosa"**. La única forma de saber si usted la tiene es midiéndose la presión. No hay otra.'),
          Aviso(Tono.consejo,
              'Medirse la presión no duele, no cuesta y toma dos minutos. **En el CAP se la miden.**'),
        ],
      ),
      Leccion(
        id: 'presion-numeros',
        titulo: '¿Qué significan los números?',
        resumen:
            'Los dos números de la presión y qué quieren decir. Cuándo se considera alta.',
        icono: Icons.speed_rounded,
        bloques: [
          Parrafo(
              'Cuando le miden la presión le dicen dos números, por ejemplo **"120 sobre 80"**.'),
          Lista([
            'El **primer número** (el más alto) es la fuerza cuando el corazón late.',
            'El **segundo número** (el más bajo) es la fuerza cuando el corazón descansa entre latido y latido.',
          ]),
          Subtitulo('De forma general'),
          Tabla(['Resultado', 'Qué significa'], [
            ['Menos de 120 sobre 70', 'Presión normal'],
            ['Entre 120/80 y 139/89', 'Presión en el límite. Es momento de cuidarse'],
            ['140 sobre 90 o más', 'Puede ser hipertensión'],
          ]),
          Parrafo(
              'Un solo número alto no significa que usted tenga hipertensión. La presión sube si acaba de caminar rápido, si está nervioso, si tomó café o si tiene dolor. Por eso el personal del CAP la mide más de una vez, en días distintos, antes de decir que usted tiene presión alta.'),
          Aviso(Tono.cuidado,
              'No se diagnostique usted mismo. Esta app le informa; quien determina si usted tiene hipertensión es el personal de salud.'),
        ],
      ),
      Leccion(
        id: 'presion-riesgo',
        titulo: '¿Quiénes tienen más riesgo?',
        resumen:
            'Factores que aumentan la probabilidad de tener presión alta. Cuáles se pueden cambiar y cuáles no.',
        icono: Icons.groups_outlined,
        bloques: [
          Parrafo('Hay cosas que aumentan el riesgo y no se pueden cambiar:'),
          Lista([
            'Tener más de 40 años.',
            'Tener familiares cercanos con presión alta.',
          ]),
          Aviso(Tono.consejo,
              'Aunque tenga antecedentes en su familia, cambiar lo que sí está en sus manos hace una diferencia real.'),
        ],
      ),
      Leccion(
        id: 'presion-prevenir',
        titulo: 'Cómo prevenir la presión alta',
        resumen:
            'Seis medidas sencillas para prevenir la hipertensión, según las recomendaciones del MSPAS.',
        icono: Icons.directions_walk_rounded,
        bloques: [
          Lista([
            '**Baje la sal.** No más de una cucharadita rasa al día, contando la que ya traen los alimentos. Esta es la recomendación del MSPAS.',
            '**Muévase.** 30 minutos al día, 5 días a la semana. Caminar rápido cuenta.',
            '**Coma más frutas y verduras:** güisquil, ayote, hierbas, banano, naranja.',
            '**Cuide su peso.** No hace falta bajar mucho: bajar poco ya ayuda a la presión.',
            '**Evite el licor y el tabaco.**',
            '**Mídase la presión** al menos una vez al mes, aunque se sienta bien.',
          ], numerada: true),
        ],
      ),
      Leccion(
        id: 'presion-alimentacion',
        titulo: 'Alimentación para personas con presión alta',
        resumen: 'Qué comer y qué evitar cuando se tiene hipertensión.',
        icono: Icons.restaurant_rounded,
        bloques: [
          Subtitulo('Lo más importante: la sal escondida'),
          Parrafo(
              'La sal que hace daño no es solo la del salero. La mayor parte viene en productos que uno no imagina:'),
          Lista([
            'Consomé en cubos y sazonadores en polvo.',
            'Sopas y fideos instantáneos.',
            'Embutidos: chorizo, salchicha, jamón.',
            'Enlatados: sardina, atún, frijoles enlatados.',
            'Churros, boquitas, galletas saladas.',
            'Salsas embotelladas, salsa inglesa, salsa de soya.',
          ]),
          Aviso(Tono.cuidado,
              'Un solo cubo de consomé puede tener casi toda la sal que usted debería consumir en un día entero.'),
          Subtitulo('Cómo dar sabor sin sal'),
          Lista([
            'Ajo, cebolla, culantro, hierbabuena, laurel, tomillo.',
            'Limón sobre las verduras y las carnes.',
            'Chile (si no le cae mal al estómago). El picante no sube la presión; la sal sí.',
            'Tomate y miltomate cocidos.',
          ]),
          Subtitulo('Qué comer más seguido'),
          Tabla(['Grupo', 'Ejemplos de la región', 'Cuánto'], [
            [
              'Verduras',
              'Güisquil, ayote, zanahoria, hierbas (chipilín, macuy, bledo), ejote',
              'En las dos comidas principales'
            ],
            ['Frutas', 'Banano, naranja, papaya, mango, jocote', '2 o 3 veces al día'],
            ['Granos', 'Frijol, haba, lenteja', 'Todos los días'],
            ['Cereales', 'Tortilla de maíz, arroz, avena', 'Todos los días'],
            ['Proteína', 'Huevo, pollo, pescado, Incaparina', 'Varias veces por semana'],
          ]),
          Subtitulo('Qué reducir'),
          Lista([
            'Manteca, chicharrón, crema.',
            'Gaseosas y jugos de bote (mucha azúcar).',
            'Pan dulce y golosinas todos los días.',
            'Café en exceso y bebidas energizantes.',
            'Licor.',
          ]),
          Subtitulo('Un ejemplo de día'),
          Tabla(['Comida', 'Qué comer'], [
            [
              'Desayuno',
              'Tortillas, frijoles sin consomé, huevo cocido, café sin azúcar o con poca.'
            ],
            ['Refacción', 'Un banano o una naranja.'],
            [
              'Almuerzo',
              'Arroz, güisquil cocido, pollo asado sin pellejo, tortillas, agua pura.'
            ],
            ['Refacción', 'Incaparina.'],
            ['Cena', 'Tortillas con frijol y hierbas cocidas con ajo y cebolla.'],
          ]),
        ],
      ),
      Leccion(
        id: 'presion-tratamiento',
        titulo: 'Vivir con presión alta: el tratamiento',
        resumen:
            'Por qué no se deben suspender las pastillas y cómo llevar el control en el CAP.',
        icono: Icons.medication_outlined,
        bloques: [
          Parrafo(
              'Si el personal del CAP le indicó pastillas para la presión, hay tres reglas:'),
          Lista([
            '**No las deje aunque se sienta bien.** La presión baja porque está tomando la pastilla. Si la deja, vuelve a subir. Sentirse bien no significa estar curado.',
            '**No las deje aunque se sienta mal.** Si cree que la pastilla le está cayendo mal, no la suspenda por su cuenta: vaya al CAP y cuéntelo. Hay otras opciones.',
            '**No comparta ni pida prestadas pastillas.** La pastilla que le sirve a su vecino puede hacerle daño a usted.',
          ], numerada: true),
          Aviso(Tono.info,
              'La hipertensión **no se cura, se controla**. Con control, una persona hipertensa puede vivir muchos años sin problemas.'),
          Aviso(Tono.consejo,
              'Lleve su control: apunte la fecha y los números cada vez que le midan la presión, o guarde su carné. Eso ayuda al personal del CAP a decidir mejor.',
              titulo: 'Lleve su control'),
          Aviso(Tono.cuidado,
              'Esta app no le indica medicamentos ni dosis. Esa es una decisión del personal de salud que lo atiende.'),
        ],
      ),
      Leccion(
        id: 'presion-alarma',
        titulo: 'Señales de alarma: presión alta',
        resumen:
            'Cuándo una persona con presión alta debe buscar atención inmediata.',
        icono: Icons.warning_amber_rounded,
        esAlarma: true,
        bloques: [
          Parrafo(
              'Vaya al CAP o al servicio de emergencia más cercano **de inmediato** si aparece cualquiera de estas señales:'),
          Senales(senalesPresion),
          Aviso(Tono.alarma,
              'No espere a que se le pase. No espere al día siguiente. No se automedique.'),
          Parrafo('Si puede, que alguien lo acompañe y avise a su familia.'),
          DatoCap('Atención de emergencias', DatosCap.horarioEmergencias,
              icono: Icons.schedule_rounded),
        ],
      ),
    ]),
  ],
  prueba: Prueba(
    id: 'prueba-presion',
    titulo: '¿Cuánto sabe de la presión alta?',
    descripcion: 'Cinco preguntas, cada una con su explicación.',
    preguntas: [
      Pregunta(
        enunciado: '¿Cómo se sabe si una persona tiene presión alta?',
        opciones: [
          'Por el dolor de cabeza',
          'Midiéndose la presión',
          'Por el color de la cara'
        ],
        correcta: 1,
        explicacion:
            'La presión alta casi no da síntomas. Solo se sabe midiéndola.',
      ),
      Pregunta(
        enunciado: '¿Cuánta sal se recomienda al día?',
        opciones: ['Una cucharada grande', 'Una cucharadita', 'La que uno quiera'],
        correcta: 1,
        explicacion:
            'El MSPAS recomienda no pasar de una cucharadita (5 gramos) al día, contando la de los alimentos.',
      ),
      Pregunta(
        enunciado: 'Si me siento bien, ¿puedo dejar la pastilla?',
        opciones: ['Sí', 'No, hay que consultar antes', 'Solo los domingos'],
        correcta: 1,
        explicacion:
            'Se siente bien porque toma la pastilla. Nunca la suspenda sin hablar con el CAP.',
      ),
      Pregunta(
        enunciado: '¿Cuál de estos tiene más sal escondida?',
        opciones: ['Un güisquil cocido', 'Un cubo de consomé', 'Una naranja'],
        correcta: 1,
        explicacion: 'Un cubo de consomé puede tener casi toda la sal de un día.',
      ),
      Pregunta(
        enunciado:
            'Siento debilidad en un brazo y no puedo hablar bien. ¿Qué hago?',
        opciones: [
          'Acostarme un rato',
          'Ir de inmediato al servicio de salud',
          'Esperar a mañana'
        ],
        correcta: 1,
        explicacion: 'Son señales de alarma. Cada minuto cuenta.',
      ),
    ],
  ),
);
