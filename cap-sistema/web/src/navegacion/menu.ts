import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ScannerIcon from '@mui/icons-material/Scanner';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MedicationIcon from '@mui/icons-material/Medication';
import InsightsIcon from '@mui/icons-material/Insights';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';

/**
 * Los seis roles del sistema (arquitectura §10.3).
 *
 * Se declaran aqui como constantes de texto en vez de importarse de @cap/shared
 * porque esa libreria es de NestJS: arrastrarla al navegador metería el guard
 * JWT, Argon2 y Prisma en el paquete que descarga el usuario.
 */
export const ROLES = [
  'ADMINISTRADOR',
  'DIRECTOR',
  'MEDICO',
  'ENFERMERIA',
  'FARMACIA',
  'RECEPCION',
] as const;

export type Rol = (typeof ROLES)[number];

export interface ElementoMenu {
  ruta: string;
  etiqueta: string;
  /** Tipado con SvgIconProps para poder darle color y tamano donde se use. */
  icono: ComponentType<SvgIconProps>;
  /** Roles que pueden entrar. Copiado de los @Roles de cada controlador. */
  roles: readonly Rol[];
  /** Todavia sin construir: la pantalla existe pero avisa que falta. */
  pendiente?: boolean;
  /** Que hara el modulo. Se muestra mientras esta pendiente. */
  descripcion: string;
}

const TODO_EL_PERSONAL: readonly Rol[] = ROLES;
const CLINICOS: readonly Rol[] = ['ADMINISTRADOR', 'DIRECTOR', 'MEDICO', 'ENFERMERIA'];

/**
 * El menu.
 *
 * Cada entrada lleva los MISMOS roles que el controlador correspondiente del
 * backend. No es decoracion: mostrarle a alguien una opcion que el servidor le
 * va a negar con un 403 es peor que no mostrarsela — la persona cree que el
 * sistema falla, cuando en realidad esta haciendo lo correcto.
 *
 * Aun asi, esto NO es el control de acceso. El control real esta en el guard
 * del backend, que revalida rol en cada peticion (§10.1). Aqui solo se decide
 * que se dibuja.
 */
export const MENU: readonly ElementoMenu[] = [
  {
    ruta: '/recepcion',
    descripcion:
      'Busqueda de pacientes por DPI, nombre o comunidad, alta de nuevos pacientes y apertura de expediente. Es la pantalla de la Etapa 5.',
    etiqueta: 'Recepcion',
    icono: BadgeIcon,
    // GET /v1/pacientes lo consulta todo el personal; el alta es de Recepcion.
    roles: TODO_EL_PERSONAL,
  },
  {
    ruta: '/espera',
    descripcion:
      'Quienes llegaron hoy y todavia no tienen ficha, en orden de llegada. Recepcion marca la llegada al entrar; la visita se cierra sola al guardar la ficha.',
    etiqueta: 'Sala de espera',
    icono: EventSeatIcon,
    // Farmacia no: la sala dice quien vino al medico y a que, y eso es
    // informacion clinica aunque no lo parezca.
    roles: ['ADMINISTRADOR', 'DIRECTOR', 'RECEPCION', 'ENFERMERIA', 'MEDICO'],
  },
  {
    ruta: '/expedientes',
    descripcion:
      'Consulta del expediente y su historial de atenciones. El acceso al historial clinico queda restringido al personal medico y de enfermeria.',
    etiqueta: 'Expedientes',
    icono: FolderSharedIcon,
    // Buscar por numero lo hace todo el personal: es la pregunta de quien tiene
    // la carpeta en la mano. El HISTORIAL de adentro no —Recepcion y Farmacia
    // ven los datos del paciente pero no sus diagnosticos— y esa restriccion la
    // aplica la propia pantalla, igual que el servidor.
    roles: TODO_EL_PERSONAL,
  },
  {
    ruta: '/digitalizacion',
    descripcion:
      'Modo de captura rapida por teclado para transcribir los expedientes en papel (RF-08), con avance por comunidad y autoguardado.',
    etiqueta: 'Digitalizacion',
    icono: ScannerIcon,
    // Recepcion captura los datos del paciente y le pasa la carpeta a
    // enfermeria, que llena las fichas. Las dos tienen que ver la cola.
    roles: ['ADMINISTRADOR', 'DIRECTOR', 'RECEPCION', 'ENFERMERIA', 'MEDICO'],
  },
  {
    ruta: '/programas',
    descripcion:
      'Seguimiento de hipertension y embarazo: inscripciones, controles, alertas de riesgo y pacientes atrasados. El backend ya esta construido (Etapa 6).',
    etiqueta: 'Programas',
    icono: MonitorHeartIcon,
    // Hipertension y embarazo. Recepcion y Farmacia no entran al historial.
    roles: CLINICOS,
    pendiente: true,
  },
  {
    ruta: '/farmacia',
    descripcion:
      'Inventario por lotes, alertas de vencimiento y entrega de medicamentos con seleccion FEFO (Etapa 8).',
    etiqueta: 'Farmacia',
    icono: MedicationIcon,
    // El medico consulta existencias: si no sabe que hay, receta lo que no hay.
    // Lo que NO ve es la alerta de vencimientos: esa es de farmacia, y el
    // propio controlador la guarda para Farmacia, Administrador y Director.
    roles: ['ADMINISTRADOR', 'DIRECTOR', 'FARMACIA', 'MEDICO', 'ENFERMERIA'],
  },
  {
    ruta: '/reportes',
    descripcion:
      'Panel de indicadores y las cifras que el CAP reporta periodicamente al MSPAS, con exportacion a hoja de calculo (Etapa 10).',
    etiqueta: 'Reportes',
    icono: InsightsIcon,
    roles: ['ADMINISTRADOR', 'DIRECTOR'],
    pendiente: true,
  },
  {
    ruta: '/auditoria',
    descripcion:
      'Consulta de la traza: quien vio o modifico cada dato clinico, con cadena de hash verificable (Etapa 9).',
    etiqueta: 'Auditoria',
    icono: HistoryEduIcon,
    roles: ['ADMINISTRADOR', 'DIRECTOR'],
    pendiente: true,
  },
  {
    ruta: '/administracion',
    descripcion:
      'Cuentas del personal, roles y segundo factor. Exclusivo del Administrador.',
    etiqueta: 'Administracion',
    icono: ManageAccountsIcon,
    // El modulo de cuentas es exclusivo del Administrador.
    roles: ['ADMINISTRADOR'],
    pendiente: true,
  },
];

/**
 * Rutas que existen pero NO salen en el menu.
 *
 * La ficha clinica no es una opcion a la que se entre: necesita un paciente ya
 * elegido, y se llega a ella desde la busqueda. Aun asi hay que cerrarla por
 * rol, porque escribir la direccion a mano tambien es una forma de entrar.
 *
 * Los roles son los MISMOS del controlador que la guarda —POST de fichas es de
 * Medico y Enfermeria— y no incluyen al Administrador aunque lo vea todo:
 * ofrecerle una pantalla que el servidor le va a negar con un 403 le haria
 * pensar que el sistema falla.
 */
const RUTAS_FUERA_DEL_MENU: Record<string, readonly Rol[]> = {
  '/ficha': ['MEDICO', 'ENFERMERIA'],
  // El expediente de UN paciente. Entran los seis: lo que cambia por rol es
  // cuanto se ve dentro, no si se puede abrir.
  '/expediente': ['ADMINISTRADOR', 'DIRECTOR', 'MEDICO', 'ENFERMERIA', 'FARMACIA', 'RECEPCION'],
  // Dar de alta a un paciente es de Recepcion. Todo el personal puede
  // BUSCARLO —por eso /recepcion es de los seis roles— pero solo recepcion y
  // administracion lo registran, que es lo que dice el controlador.
  '/recepcion/nuevo': ['RECEPCION', 'ADMINISTRADOR'],
  // Un medicamento concreto. Entran los mismos cinco roles que a Farmacia: lo
  // que cambia por rol es que se puede HACER dentro —solo Farmacia y
  // Administracion ingresan lotes o dan de baja— no si se puede abrir.
  '/farmacia/medicamento': ['ADMINISTRADOR', 'DIRECTOR', 'FARMACIA', 'MEDICO', 'ENFERMERIA'],
  // El despacho de medicamentos. Se llega desde Farmacia, con el boton de
  // arriba. Los roles son los del POST /v1/entregas: el medico consulta el
  // historial pero no despacha.
  '/farmacia/entrega': ['FARMACIA', 'ADMINISTRADOR'],
};

/** Opciones visibles para un rol. Vacio si el rol no se reconoce. */
export function menuPara(rol: string | undefined): ElementoMenu[] {
  if (!rol) return [];
  return MENU.filter((e) => (e.roles as readonly string[]).includes(rol));
}

/** true si ese rol puede entrar a esa ruta, este o no en el menu. */
export function puedeEntrar(rol: string | undefined, ruta: string): boolean {
  if (!rol) return false;
  const fuera = RUTAS_FUERA_DEL_MENU[ruta];
  if (fuera) return (fuera as readonly string[]).includes(rol);
  return menuPara(rol).some((e) => e.ruta === ruta);
}
