import 'package:flutter/material.dart';

import '../modelo/contenido.dart';
import '../tema.dart';
import 'datos_cap.dart';

const senalesEmbarazo = [
  'Sangrado por la vagina, poco o mucho.',
  'Dolor de cabeza fuerte que no se quita.',
  'Ver lucecitas, manchas o borroso.',
  'Hinchazón de la cara, las manos o los pies que aparece de repente.',
  'Convulsiones o ataques.',
  'Fiebre.',
  'Dolor fuerte en la barriga.',
  'Salida de líquido por la vagina antes de tiempo.',
  'El bebé se mueve menos de lo normal o dejó de moverse.',
  'Vómitos que no paran y no le permiten comer ni tomar agua.',
  'Ardor o dolor al orinar.',
  'Dificultad para respirar.',
  'Desmayo.',
];

const senalesPosparto = [
  'Sangrado abundante (que empapa más de un paño por hora) o que aumenta.',
  'Fiebre o escalofríos.',
  'Mal olor en el sangrado.',
  'Dolor fuerte en la barriga.',
  'Dolor de cabeza fuerte, ver borroso o hinchazón (la presión alta también puede aparecer después del parto).',
  'Dolor, enrojecimiento o endurecimiento en un pecho con fiebre.',
  'Tristeza profunda que no se le quita, o pensamientos que la asustan. Esto también se atiende; dígalo.',
];

const senalesRecienNacido = [
  'No quiere mamar.',
  'Está muy dormido y no despierta para comer.',
  'Respira muy rápido o se le hunden las costillas al respirar.',
  'Fiebre o, al contrario, se siente frío.',
  'Se pone amarillo (la piel o los ojos).',
  'El ombligo se ve rojo, con pus o mal olor.',
  'Convulsiones.',
];

const ejeEmbarazo = Eje(
  id: 'embarazo',
  nombre: 'Embarazo y familia',
  nombreLargo: 'Embarazo saludable y control',
  lema:
      'Control prenatal, alimentación, señales de peligro, planificación familiar y prevención del embarazo en adolescentes.',
  color: Colores.fucsia,
  tinte: Colores.fucsiaTinte,
  icono: Icons.pregnant_woman_rounded,
  porQueImporta: [
    Parrafo(
        'Guatemala tiene una **Ley para la Maternidad Saludable** (Decreto 32-2010) que obliga al Estado a garantizar atención prenatal gratuita, con énfasis en la cantidad de controles, la vigilancia nutricional de la mujer y la identificación de signos de peligro.'),
    Parrafo(
        'Aun así, cerca de **1 de cada 4 mujeres** no llega al mínimo de cuatro controles prenatales recomendados, y el problema es mayor en el área rural.'),
    Parrafo(
        'Sobre embarazo en niñas y adolescentes, los datos son duros y recientes. Hasta julio de 2026 el OSAR registró **1,294 embarazos en niñas de 10 a 14 años** en el país, con Alta Verapaz en segundo lugar (185 casos), solo detrás de Huehuetenango. Durante 2025 hubo 2,101 nacimientos de niñas de 10 a 14 años y 54,788 partos de adolescentes de 15 a 19 años.'),
    Aviso(Tono.cuidado,
        'Las niñas menores de 15 años tienen **14 veces más probabilidad** de morir durante el embarazo o el parto, y sus bebés tienen más riesgo de desnutrición crónica y muerte.'),
  ],
  secciones: [
    Seccion(titulo: 'Embarazo y control', lecciones: [
      Leccion(
        id: 'emb-como-se',
        titulo: '¿Cómo sé que estoy embarazada?',
        resumen: 'Primeras señales del embarazo y qué hacer al sospecharlo.',
        icono: Icons.help_outline_rounded,
        bloques: [
          Subtitulo('Las señales más comunes'),
          Lista([
            'No le vino la regla (la menstruación).',
            'Náuseas o ganas de vomitar, sobre todo en la mañana.',
            'Los pechos se sienten más grandes o duelen.',
            'Cansancio, sueño más de lo normal.',
            'Ganas de orinar más seguido.',
            'Cambios en el apetito o rechazo a ciertos olores.',
          ]),
          Aviso(Tono.info,
              'Ninguna señal por sí sola confirma un embarazo. Vaya al CAP: ahí le pueden hacer una prueba y confirmarlo.'),
          Aviso(Tono.consejo,
              'Vaya **lo más pronto posible**. No espere a que se le note. Entre más temprano empiece su control, mejor para usted y para el bebé. La atención prenatal en los servicios públicos es **gratuita por ley**.'),
        ],
      ),
      Leccion(
        id: 'emb-control',
        titulo: 'El control prenatal: cuántas veces y para qué',
        resumen: 'Cuántas veces ir y qué le hacen en cada visita.',
        icono: Icons.event_available_outlined,
        bloques: [
          Parrafo(
              'El control prenatal es la serie de visitas al servicio de salud durante el embarazo. No es solo "ver cómo va el bebé": sirve para **encontrar problemas antes de que se vuelvan graves**.'),
          Parrafo(
              'El MSPAS establece un mínimo de **cuatro atenciones prenatales** en un embarazo sin complicaciones:'),
          Tabla(['Atención', 'Cuándo'], [
            [
              'Primera',
              'Lo más temprano posible, antes de las 12 semanas (3 meses)'
            ],
            ['Segunda', 'Durante el segundo trimestre'],
            ['Tercera', 'Durante el tercer trimestre'],
            ['Cuarta', 'Entre las semanas 36 y 38'],
          ]),
          DatoCap('Semanas según la norma del CAP',
              DatosCap.semanasControlPrenatal,
              icono: Icons.event_note_outlined),
          Aviso(Tono.info,
              'Cuatro es el mínimo. La OMS recomienda al menos ocho contactos, porque más visitas dan más oportunidades de detectar complicaciones. Si el personal le pide venir más seguido, es porque su caso lo necesita.'),
          Subtitulo('Qué le hacen en cada visita'),
          Lista([
            'Le toman la presión arterial (muy importante: la presión alta en el embarazo es peligrosa).',
            'La pesan y miden.',
            'Miden su brazo con una cinta, para ver su estado nutricional.',
            'Revisan cómo va creciendo el bebé y escuchan sus latidos.',
            'Le dan hierro y ácido fólico.',
            'Revisan su vacuna contra el tétanos.',
            'Le preguntan y le explican las señales de peligro.',
            'Le ayudan a hacer su plan de parto.',
          ]),
          Aviso(Tono.consejo,
              'Lleve siempre su **carné de embarazada**. Si va a otro servicio, ese carné es su historia.'),
        ],
      ),
      Leccion(
        id: 'emb-alimentacion',
        titulo: 'Alimentación durante el embarazo',
        resumen:
            'Qué comer durante el embarazo con alimentos de la región, y por qué el hierro y el ácido fólico importan.',
        icono: Icons.restaurant_rounded,
        bloques: [
          Parrafo(
              'Durante el embarazo su cuerpo necesita más energía y más proteína, porque está formando a otra persona.'),
          Aviso(Tono.info,
              'No se trata de "comer por dos". Se trata de **comer un poco más y mejor**.'),
          Subtitulo('Lo que no debe faltar'),
          Tabla(['Necesita', 'Dónde está'], [
            ['Proteína', 'Huevo, frijol, pollo, pescado, Incaparina, queso'],
            ['Hierro', 'Hígado y menudos, frijol, hierbas verdes oscuras'],
            ['Ácido fólico', 'Hierbas verdes, frijol, hígado, naranja'],
            ['Calcio', 'Tortilla de maíz, queso, leche, hierbas'],
            ['Energía', 'Tortilla, arroz, papa, plátano, ayote'],
          ]),
          Aviso(Tono.consejo,
              'El hierro de las plantas se absorbe mejor con vitamina C. Coma sus frijoles o sus hierbas con **limón o con una naranja**. El café y el té, en cambio, dificultan la absorción del hierro; mejor tómelos lejos de las comidas.',
              titulo: 'Un truco importante'),
          Subtitulo('Las pastillas de hierro y ácido fólico'),
          Parrafo(
              '**Tómelas aunque coma bien.** Es muy difícil obtener solo con la comida todo el hierro y el ácido fólico que se necesitan en el embarazo. El ácido fólico previene defectos graves en el cerebro y la columna del bebé, y el hierro previene la anemia de la madre, que es peligrosa en el parto.'),
          Parrafo(
              'Si le producen molestias en el estómago o estreñimiento, no las suspenda: coméntelo en el CAP.'),
          Subtitulo('Evite durante el embarazo'),
          Lista([
            'Licor de cualquier tipo y en cualquier cantidad.',
            'Cigarro y tabaco, incluso el humo de otros.',
            'Medicamentos que no le haya indicado el personal de salud, incluidas pastillas para el dolor y remedios que "le sirvieron a otra".',
            'Carne o huevo crudos o mal cocidos.',
            'Exceso de café.',
          ]),
          Parrafo('Tome bastante agua pura o hervida.'),
        ],
      ),
      Leccion(
        id: 'emb-cuidados',
        titulo: 'Cuidados durante el embarazo',
        resumen: 'Descanso, trabajo, higiene, sueño y ánimo durante el embarazo.',
        icono: Icons.spa_outlined,
        bloques: [
          Lista([
            '**Descanse.** Si puede, acuéstese un rato durante el día, de lado izquierdo de preferencia.',
            '**No cargue cosas pesadas.** Pida ayuda con los tambos de agua y la leña. Esto no es debilidad.',
            '**Muévase con suavidad.** Caminar está bien y ayuda.',
            '**Duerma lo que pueda**, incluso a ratos.',
            '**Lávese las manos** antes de comer y después del baño.',
            '**Cuide sus dientes.** Las infecciones en la boca pueden afectar el embarazo.',
            '**Use zapato plano y cómodo.** El equilibrio cambia y las caídas son riesgosas.',
            '**Hable de cómo se siente.** El embarazo trae cambios de ánimo. Si se siente triste la mayor parte del tiempo, cuéntelo en el CAP: eso también se atiende.',
          ]),
          Aviso(Tono.alarma,
              'Si alguien en su casa la golpea, la amenaza o la obliga a tener relaciones, eso pone en riesgo su embarazo y su vida. **No es normal y no es su culpa.** Puede contarlo en el CAP con confianza.',
              titulo: 'Violencia'),
        ],
      ),
      Leccion(
        id: 'emb-alarma',
        titulo: 'Señales de peligro en el embarazo',
        resumen: 'Señales por las que una embarazada debe buscar atención inmediata.',
        icono: Icons.warning_amber_rounded,
        esAlarma: true,
        bloques: [
          Parrafo(
              'Vaya **de inmediato** al CAP o al hospital si presenta cualquiera de estas señales, a cualquier hora del día o de la noche:'),
          Senales(senalesEmbarazo),
          Aviso(Tono.alarma,
              '**Dolor de cabeza fuerte + ver borroso + hinchazón de cara y manos.** Pueden ser señal de presión alta del embarazo, que es una de las principales causas de muerte materna. No espere.',
              titulo: 'Las tres más peligrosas juntas'),
          Aviso(Tono.consejo,
              'Tenga listo desde ahora: cómo va a llegar al servicio de salud, quién la lleva, quién cuida a los demás niños, y su carné de embarazada a la mano.'),
          DatoCap('Atención de emergencias', DatosCap.horarioEmergencias,
              icono: Icons.schedule_rounded),
        ],
      ),
      Leccion(
        id: 'emb-parto',
        titulo: 'El parto y el plan de parto',
        resumen: 'Cómo prepararse para el parto y qué decisiones tomar antes.',
        icono: Icons.checklist_rounded,
        bloques: [
          Parrafo(
              'El plan de parto es **acordar antes** lo que se va a hacer cuando llegue el momento. Se hace en el control prenatal, con el personal del CAP y con su familia.'),
          Subtitulo('Incluye'),
          Lista([
            '**Dónde** va a tener a su bebé. El parto atendido por personal calificado es más seguro.',
            '**Cómo va a llegar.** Qué transporte, quién lo consigue, cuánto cuesta, a quién llamar de noche.',
            '**Quién la acompaña** y quién se queda con los otros niños.',
            '**A quién avisar** si hay una complicación.',
            '**Qué llevar:** carné, ropa para usted y el bebé, lo que le indiquen en el CAP.',
            '**Dinero apartado** para el transporte, aunque la atención sea gratuita.',
          ]),
          Subtitulo('Señales de que empezó el parto'),
          Lista([
            'Contracciones regulares que se van haciendo más seguidas y fuertes.',
            'Salida de líquido por la vagina.',
          ]),
          Aviso(Tono.alarma,
              'Si hay sangrado abundante, si el líquido es verde u oscuro, o si el bebé no se mueve, vaya de inmediato aunque no haya contracciones.'),
          Aviso(Tono.info,
              'Si en su comunidad hay comadrona, ella es parte del sistema: coordine con el CAP y con ella. La comadrona sabe cuándo referir.'),
        ],
      ),
      Leccion(
        id: 'emb-posparto',
        titulo: 'Después del parto: usted y su bebé',
        resumen:
            'Cuidados del puerperio, señales de peligro después del parto y el control posparto.',
        icono: Icons.child_friendly_outlined,
        bloques: [
          Parrafo(
              'Las primeras horas y días después del parto son de los momentos de mayor riesgo. **No los pase sola.**'),
          Aviso(Tono.info,
              'Debe recibir atención dentro de las **primeras 24 a 48 horas** después del parto, y luego según le indiquen. Si el parto fue en casa, personal calificado debe visitarla en ese plazo.',
              titulo: 'Control posparto'),
          Senales(senalesPosparto,
              titulo: 'Señales de peligro en la madre después del parto — busque atención de inmediato'),
          Senales(senalesRecienNacido,
              titulo: 'Señales de peligro en el recién nacido'),
          Aviso(Tono.consejo,
              'Siga tomando hierro y ácido fólico según le indiquen, coma bien, tome líquidos, descanse cuando el bebé duerma y acepte ayuda.',
              titulo: 'Cuídese usted'),
        ],
      ),
      Leccion(
        id: 'emb-espacios',
        titulo: 'Espacios después del embarazo',
        resumen:
            'Por qué esperar entre un embarazo y otro protege a la madre y a los hijos.',
        icono: Icons.date_range_outlined,
        bloques: [
          Parrafo(
              'Tener embarazos muy seguidos es riesgoso, y los datos de Guatemala lo confirman:'),
          Cifra('57%',
              'de los hijos de madres con poco espacio entre embarazos tiene desnutrición crónica, muy por encima del promedio nacional.'),
          Subtitulo('Por qué'),
          Lista([
            'El cuerpo de la madre no alcanza a recuperar el hierro y demás reservas. Sube el riesgo de anemia y de complicaciones.',
            'El bebé anterior pierde el pecho antes de tiempo.',
            'La atención y los recursos de la familia se reparten entre más niños pequeños a la vez.',
          ]),
          Aviso(Tono.consejo,
              'Esperar **al menos dos años** entre un parto y el siguiente embarazo protege a la madre, al hijo que ya nació y al que viene.'),
          Parrafo(
              'Esperar es una decisión que se puede tomar: existen métodos gratuitos en el CAP para lograrlo. Si no quiere otro embarazo pronto, consulte en el CAP durante el posparto.'),
        ],
      ),
    ]),
    Seccion(titulo: 'Planificación familiar', lecciones: [
      Leccion(
        id: 'pf-ley',
        titulo: 'Qué es y qué dice la ley',
        resumen:
            'Derecho a los servicios de planificación familiar en Guatemala y gratuidad en el sistema público.',
        icono: Icons.gavel_rounded,
        bloques: [
          Parrafo(
              'Planificación familiar es **decidir cuántos hijos tener y cada cuánto tenerlos**. No es dejar de tener hijos: es decidir cuándo.'),
          Parrafo(
              'En Guatemala esto es un derecho reconocido por ley. La Ley de Acceso Universal y Equitativo de Servicios de Planificación Familiar (Decreto 87-2005) obliga al MSPAS y al IGSS a mantener disponibles todos los métodos modernos en la red pública de salud.'),
          Subtitulo('Tres cosas que conviene saber'),
          Lista([
            'En el MSPAS los métodos son **gratuitos**.',
            '**Usted decide.** Nadie puede obligarla a usar un método ni a dejar de usarlo. La ley establece sanciones incluso para el esposo o conviviente que impida el acceso al uso de métodos.',
            'La consejería es **confidencial**.',
          ]),
          DatoCap('Consejería en planificación familiar',
              DatosCap.horarioPlanificacion,
              icono: Icons.schedule_rounded),
          DatoCap('Métodos disponibles en el CAP', DatosCap.metodosDisponibles,
              icono: Icons.inventory_2_outlined),
        ],
      ),
      Leccion(
        id: 'pf-metodos',
        titulo: 'Los métodos disponibles en el MSPAS',
        resumen:
            'Lista de los métodos que entrega el sistema público, cómo funcionan y para quién son más apropiados.',
        icono: Icons.grid_view_rounded,
        bloques: [
          Parrafo(
              'Estos son los métodos que el MSPAS entrega de forma gratuita: pastillas, inyecciones, condón, implante subdérmico, T de cobre, operación de la mujer, operación del hombre y la píldora anticonceptiva de emergencia.'),
          Subtitulo('De larga duración (los más efectivos)'),
          Tabla(['Método', 'Cómo es', 'Cuánto dura', 'Notas'], [
            [
              'Implante ("los palitos")',
              'Varillas pequeñas que se colocan bajo la piel del brazo',
              'Varios años',
              'De los más efectivos. Se puede retirar antes si quiere embarazarse'
            ],
            [
              'T de cobre (DIU)',
              'Dispositivo que se coloca dentro de la matriz',
              'Varios años',
              'Se puede colocar después del parto. No lleva hormonas'
            ],
          ]),
          Subtitulo('Temporales'),
          Tabla(['Método', 'Cómo es', 'Cada cuánto'], [
            ['Inyección', 'Se aplica en el CAP', 'Mensual o trimestral, según el tipo'],
            [
              'Pastillas',
              'Una diaria',
              'Requiere tomarla todos los días a la misma hora'
            ],
            [
              'Condón',
              'Se usa en cada relación',
              'Único que también protege de infecciones de transmisión sexual y VIH'
            ],
          ]),
          Subtitulo('Permanentes (para quien ya no desea más hijos)'),
          Tabla(['Método', 'Para quién'], [
            [
              'Operación de la mujer',
              'Mujeres que decidieron no tener más hijos'
            ],
            [
              'Operación del hombre (vasectomía)',
              'Hombres que decidieron no tener más hijos. Es una operación más sencilla que la de la mujer'
            ],
          ]),
          Aviso(Tono.cuidado,
              'Ambas se consideran permanentes. Piénselo bien y converse en pareja antes de decidir.'),
          Subtitulo('Sobre la efectividad'),
          Parrafo(
              'Los métodos de larga duración y los permanentes son los más efectivos. Las inyecciones y pastillas son muy efectivas si se usan bien, pero fallan más porque se olvidan o se atrasa la cita. El condón usado solo es el menos efectivo de los modernos, pero es el único que protege de infecciones.'),
          Aviso(Tono.consejo,
              'Usar condón junto con otro método da lo mejor de ambos: protección contra el embarazo y contra infecciones.',
              titulo: 'La doble protección'),
          Parrafo(
              '**Métodos naturales** (contar los días, retiro): son mucho menos seguros. Dependen de ciclos regulares y de mucha disciplina, y no protegen de infecciones. Si de verdad no quiere un embarazo ahora, hable en el CAP sobre un método más seguro.'),
          Aviso(Tono.info,
              'Cuál método le conviene depende de su edad, su salud, si está dando pecho y de lo que usted quiera. Esa decisión se toma en la consejería del CAP, no en esta app.'),
        ],
      ),
      Leccion(
        id: 'pf-emergencia',
        titulo: 'La píldora de emergencia (PAE)',
        resumen: 'Qué es la anticoncepción de emergencia, cuándo se usa y qué no es.',
        icono: Icons.medication_liquid_outlined,
        bloques: [
          Parrafo(
              'La píldora anticonceptiva de emergencia (PAE) sirve para prevenir un embarazo **después** de una relación sin protección, cuando falló el método (se rompió el condón) o después de una violación.'),
          Subtitulo('Lo esencial'),
          Lista([
            'Es **más efectiva mientras más pronto se tome**. Se toma dentro de los días siguientes a la relación, y lo antes posible.',
            'Forma parte de los métodos que entrega el MSPAS.',
            '**No sirve como método regular.** Es para emergencias. Si la necesita seguido, lo que necesita es un método permanente o de larga duración.',
            'No protege de infecciones de transmisión sexual.',
          ]),
          Aviso(Tono.alarma,
              'Además de la PAE, hay atención médica y una ruta legal. Vaya al servicio de salud lo antes posible. No se bañe ni cambie de ropa antes de ir, si puede evitarlo, porque eso ayuda en la denuncia. **No es su culpa** y usted tiene derecho a ser atendida.',
              titulo: 'Si hubo una violación'),
        ],
      ),
      Leccion(
        id: 'pf-its',
        titulo: 'Infecciones de transmisión sexual y VIH',
        resumen:
            'Prevención básica de ITS, importancia del condón y de la prueba en el embarazo.',
        icono: Icons.shield_outlined,
        bloques: [
          Parrafo(
              'Las infecciones de transmisión sexual se contagian durante las relaciones sexuales. Algunas se curan con tratamiento; otras, como el VIH, no se curan, pero se controlan con medicamento de por vida.'),
          Subtitulo('Señales para consultar'),
          Lista([
            'Flujo distinto o con mal olor.',
            'Ardor al orinar.',
            'Llagas o granitos en los genitales.',
            'Dolor en la parte baja de la barriga.',
            'Picazón.',
          ]),
          Aviso(Tono.info,
              'Muchas infecciones no dan ninguna señal, por eso la prueba importa.'),
          Subtitulo('Cómo prevenirlas'),
          Parrafo(
              'El **condón**, usado correctamente en todas las relaciones, es el único método que protege. Ningún otro método anticonceptivo protege de infecciones.'),
          Subtitulo('En el embarazo'),
          Parrafo(
              'En el control prenatal le ofrecen pruebas de VIH y sífilis. **Acepte hacérselas.** Si una mujer embarazada tiene VIH y recibe tratamiento, en la gran mayoría de los casos el bebé no se contagia. La sífilis no tratada puede causar la muerte del bebé, y se trata fácilmente si se detecta.'),
          Aviso(Tono.consejo,
              'Hacerse la prueba no es desconfianza: es cuidarse.'),
        ],
      ),
    ]),
    Seccion(titulo: 'Embarazo en adolescentes', lecciones: [
      Leccion(
        id: 'ado-magnitud',
        titulo: 'Por qué importa la edad',
        resumen:
            'La magnitud del embarazo adolescente en Guatemala y en Alta y Baja Verapaz, y sus riesgos reales.',
        icono: Icons.insights_rounded,
        bloques: [
          Parrafo(
              'Esto no es raro ni lejano. En Guatemala, hasta julio de 2026, se registraron **1,294 embarazos en niñas de 10 a 14 años**. Alta Verapaz fue el segundo departamento con más casos, con 185.'),
          Parrafo(
              'Durante todo 2025 hubo 2,101 nacimientos de niñas de 10 a 14 años y 54,788 partos de adolescentes de 15 a 19 años.'),
          Subtitulo('Un embarazo a esa edad es más riesgoso'),
          Parrafo(
              'El cuerpo de una niña o una adolescente todavía está creciendo:'),
          Cifra('14 veces',
              'más probabilidad de morir durante el embarazo o el parto tienen las niñas menores de 15 años, comparadas con una mujer adulta.'),
          Lista([
            'Hay más riesgo de que el bebé nazca antes de tiempo o con bajo peso.',
            'Los hijos de madres muy jóvenes tienen más riesgo de desnutrición crónica.',
            'La mayoría de las adolescentes que se embarazan deja la escuela, y eso cambia toda su vida después.',
          ]),
          Aviso(Tono.info,
              'Esto no se dice para asustar ni para culpar a nadie. Se dice porque muchas adolescentes no reciben esta información a tiempo, y **tienen derecho a tenerla**.'),
        ],
      ),
      Leccion(
        id: 'ado-ley',
        titulo: 'Lo que dice la ley en Guatemala',
        resumen:
            'En Guatemala, toda relación sexual con una menor de 14 años es violación. Ruta de denuncia.',
        icono: Icons.balance_rounded,
        bloques: [
          Parrafo(
              'En Guatemala, **toda relación sexual con una persona menor de 14 años es violación**, aunque la niña haya dicho que sí y aunque no haya habido golpes ni amenazas. Así lo establece la ley.'),
          Parrafo(
              'Esto significa que un embarazo en una niña menor de 14 años es siempre resultado de un delito, sin excepción. No importa si el hombre es su novio, un familiar, un vecino o alguien mucho mayor.'),
          Aviso(Tono.alarma,
              '**No es su culpa. No tiene que guardar el secreto.** Guardar el secreto es lo que protege a quien le hace daño, no a usted. Puede contarlo en el CAP. También puede contarlo a una maestra, a una enfermera o a un adulto en quien confíe.',
              titulo: 'Si usted es una niña o adolescente y esto le está pasando'),
          Aviso(Tono.cuidado,
              'Denunciar no destruye a la familia; protege a la niña. Ocultar el hecho o llegar a un arreglo con el agresor la deja desprotegida y es ilegal.',
              titulo: 'Si usted es madre, padre o familiar'),
          Subtitulo('Dónde denunciar'),
          Lista([
            'Ministerio Público (MP)',
            'Procuraduría General de la Nación (PGN)',
            'Policía Nacional Civil',
            'Juzgado de Niñez y Adolescencia',
            'Cualquier servicio de salud, incluido este CAP',
          ]),
          DatoCap('Números de denuncia', DatosCap.numerosDenuncia,
              icono: Icons.phone_outlined),
          DatoCap('MP o juzgado más cercano', DatosCap.direccionDenuncia,
              icono: Icons.place_outlined),
          DatoCap('Contacto en el CAP para estos casos',
              DatosCap.contactoCasosCap,
              icono: Icons.person_outline_rounded),
        ],
      ),
      Leccion(
        id: 'ado-decidir',
        titulo: 'Para adolescentes: decidir con información',
        resumen:
            'Derechos de la persona adolescente en los servicios de salud y cómo prevenir un embarazo.',
        icono: Icons.lightbulb_outline_rounded,
        bloques: [
          Parrafo(
              'Si usted es adolescente, tiene derecho a recibir información y atención en salud sexual y reproductiva. La ley reconoce la atención diferenciada para adolescentes.'),
          Subtitulo('Lo que conviene saber'),
          Lista([
            'Se puede quedar embarazada **desde la primera vez**. No hay "primera vez que no cuenta".',
            'Se puede quedar embarazada estando de pie, en cualquier posición, y también si es la única vez en el mes.',
            'Lavarse después no previene el embarazo. Nada de lo que se hace después de la relación previene el embarazo, salvo la PAE.',
            'El retiro antes de terminar no es confiable.',
            'Si no quiere tener relaciones, **tiene derecho a decir que no**, en cualquier momento, aunque antes haya dicho que sí, aunque sea su novio, aunque ya hayan tenido relaciones antes. Nadie tiene derecho a presionarla, chantajearla ni amenazarla.',
            'Si alguien la presiona diciendo que "si me quisieras, lo harías", eso es una forma de presión, no de cariño.',
          ]),
          Aviso(Tono.info,
              'La forma más segura de no quedar embarazada es no tener relaciones sexuales. Esa decisión es válida y no tiene que justificarla ante nadie.'),
          Parrafo(
              'Si decide tener relaciones, use protección desde la primera vez: condón siempre, y de preferencia junto con otro método. En el CAP le pueden orientar.'),
          Aviso(Tono.consejo,
              'Puede ir al CAP a preguntar. **Preguntar no la compromete a nada.**'),
          DatoCap('Atención para adolescentes en el CAP',
              DatosCap.atencionAdolescentes,
              icono: Icons.schedule_rounded),
        ],
      ),
      Leccion(
        id: 'ado-familias',
        titulo: 'Para madres, padres y cuidadores',
        resumen:
            'Cómo hablar con hijos adolescentes sobre sexualidad, y por qué el silencio no protege.',
        icono: Icons.family_restroom_rounded,
        bloques: [
          Parrafo(
              'Mucha gente cree que hablar de estos temas con los hijos "les da ideas". Lo que muestra la evidencia es lo contrario: los adolescentes que reciben información de sus familias **retrasan el inicio de las relaciones sexuales y se cuidan más** cuando las tienen.'),
          Aviso(Tono.cuidado,
              'El silencio no protege. Lo que hace es que su hijo o hija consiga la información de otros adolescentes, de internet o de alguien que quiere aprovecharse.'),
          Subtitulo('Qué ayuda'),
          Lista([
            '**Hablar antes** de que pase, no después.',
            '**Escuchar más que regañar.** Si su hija teme su reacción, no le contará nada, ni siquiera si alguien la está agrediendo.',
            '**Llamar a las cosas por su nombre.**',
            '**Estar pendiente** de relaciones con hombres mucho mayores. Una diferencia grande de edad con una adolescente casi nunca es una relación entre iguales.',
            '**Apoyar que siga en la escuela.** La escolaridad es una de las mejores protecciones contra el embarazo temprano.',
            '**Que el padre también hable** con los hijos varones. La prevención no es solo tarea de las mujeres.',
          ]),
          Aviso(Tono.info,
              'Lo que más la protege ahora es que reciba control prenatal y que siga estudiando si es posible. Regañarla o echarla de la casa la pone en mayor riesgo a ella y al bebé. Si es menor de 14 años, hay además una ruta legal que debe activarse.',
              titulo: 'Si su hija ya está embarazada'),
        ],
      ),
    ]),
  ],
  prueba: Prueba(
    id: 'prueba-embarazo',
    titulo: 'Mitos y verdades',
    descripcion: 'Seis frases que se oyen seguido. ¿Mito o verdad?',
    mitoVerdad: true,
    preguntas: [
      Pregunta(
        enunciado: '"La primera vez no se puede quedar embarazada"',
        opciones: ['Mito', 'Verdad'],
        correcta: 0,
        explicacion: 'Se puede quedar embarazada desde la primera relación sexual.',
      ),
      Pregunta(
        enunciado: '"Lavarse después evita el embarazo"',
        opciones: ['Mito', 'Verdad'],
        correcta: 0,
        explicacion:
            'Nada de lo que se hace después evita el embarazo, salvo la píldora de emergencia.',
      ),
      Pregunta(
        enunciado: '"En el CAP los métodos de planificación son gratuitos"',
        opciones: ['Mito', 'Verdad'],
        correcta: 1,
        explicacion:
            'La ley obliga al MSPAS a mantener disponibles los métodos modernos, sin costo.',
      ),
      Pregunta(
        enunciado: '"Dar pecho evita quedar embarazada"',
        opciones: ['Mito', 'Verdad'],
        correcta: 0,
        explicacion:
            'No es un método confiable. Muchas mujeres se embarazan dando de mamar.',
      ),
      Pregunta(
        enunciado:
            '"Si tiene menos de 14 años y quedó embarazada, es un delito aunque ella haya aceptado"',
        opciones: ['Mito', 'Verdad'],
        correcta: 1,
        explicacion:
            'La ley guatemalteca considera violación toda relación sexual con menores de 14 años.',
      ),
      Pregunta(
        enunciado:
            '"El condón sirve para prevenir embarazo y también infecciones"',
        opciones: ['Mito', 'Verdad'],
        correcta: 1,
        explicacion: 'Es el único método que protege de ambas cosas.',
      ),
    ],
  ),
);
