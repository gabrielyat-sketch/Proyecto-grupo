import { useState } from 'react';
import { Link as EnlaceRuta, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { obtenerCarpeta } from '../carpetas/servicio-carpetas';
import { fichaParaPaciente, type FichaSugerida } from './ficha-por-edad';
import type { TipoFicha } from './servicio-fichas';

/**
 * Saltar a otro integrante de la carpeta familiar.
 *
 * El caso es de todos los dias: llega la senora con el nino en brazos,
 * recepcion marca la llegada de ELLA, y la enfermera se encuentra una ficha de
 * adulto cuando iba a pesar al nino. Hasta ahora la unica salida era volver a
 * Recepcion, buscar al nino y empezar de nuevo.
 *
 * La tentacion es dejar elegir la ficha y ya, pero eso resuelve el sintoma —la
 * pantalla equivocada— y no la causa, que es que el PACIENTE es otro: los datos
 * del nino acabarian en el expediente de la madre, y eso no se nota hasta que
 * anos despues alguien lee un antecedente que no es de quien tiene delante.
 *
 * Aqui se cambia de persona, no de formulario, y a cada una se le abre LA SUYA:
 * la de adulto a la madre, la de ninez al de dos anos, la de menor de 28 dias
 * al recien nacido. Lo decide `fichaParaPaciente`, el mismo sitio que lo decide
 * en recepcion.
 */
export function OtroIntegrante({
  pacienteId,
  grupoFamiliarId,
}: {
  pacienteId: string;
  /** Sin carpeta no hay a quien saltar: el control no se dibuja. */
  grupoFamiliarId?: string | null;
}) {
  const [ancla, setAncla] = useState<null | HTMLElement>(null);
  const navegar = useNavigate();

  const carpeta = useQuery({
    queryKey: ['carpeta', grupoFamiliarId],
    queryFn: () => obtenerCarpeta(grupoFamiliarId!),
    // Solo se pide al abrir el menu: la ficha ya hace varias consultas al
    // montar, y esta no hace falta hasta que alguien la pulsa.
    enabled: Boolean(grupoFamiliarId) && ancla !== null,
  });

  if (!grupoFamiliarId) return null;

  const otros = (carpeta.data?.integrantes ?? []).filter((p) => p.id !== pacienteId);

  return (
    <>
      <Button
        size="small"
        color="inherit"
        startIcon={<GroupOutlinedIcon />}
        onClick={(e) => setAncla(e.currentTarget)}
      >
        Otro integrante
      </Button>

      <Menu anchorEl={ancla} open={Boolean(ancla)} onClose={() => setAncla(null)}>
        {carpeta.isPending ? (
          <MenuItem disabled>Consultando la carpeta...</MenuItem>
        ) : otros.length === 0 ? (
          <MenuItem disabled>Es la unica persona de esta carpeta</MenuItem>
        ) : (
          otros.map((p) => {
            const suya = fichaParaPaciente(p.fechaNacimiento as unknown as string, p.id);
            return (
              <MenuItem
                key={p.id}
                onClick={() => {
                  setAncla(null);
                  // Sin pantalla todavia queda el expediente, que es de donde
                  // se puede seguir.
                  navegar(suya.ruta ?? '/pacientes/' + p.id + '/expediente');
                }}
              >
                <ListItemText
                  primary={p.apellidos + ', ' + p.nombres}
                  secondary={suya.motivo + ' · ' + suya.nombre}
                />
              </MenuItem>
            );
          })
        )}
      </Menu>
    </>
  );
}

/**
 * Saltar a la hoja prenatal o a la del posparto.
 *
 * Las otras tres fichas las elige el sistema por la fecha de nacimiento, y
 * acierta siempre porque la edad no es opinable. Con esta no puede: la misma
 * mujer de 24 anos necesita la de adultos hoy y la prenatal en tres meses, y el
 * sistema no sabe que esta embarazada hasta que alguien se lo dice.
 *
 * Por eso se entra desde la ficha de adultos —que es la que le toca por edad— y
 * no al reves. La alternativa era preguntar el motivo de la consulta antes de
 * abrir cualquier ficha de una mujer, y eso habria puesto un paso mas en TODAS
 * las consultas, incluidas las que no tienen nada que ver con un embarazo, que
 * son la mayoria.
 *
 * Solo se dibuja para pacientes registradas como mujeres. Si el sexo esta mal
 * en el expediente, la propia hoja prenatal lo dice al abrirse y manda a
 * corregirlo a Recepcion.
 */
export function HojaDeEmbarazo({
  pacienteId,
  esMujer,
}: {
  pacienteId: string;
  esMujer: boolean;
}) {
  const [ancla, setAncla] = useState<null | HTMLElement>(null);
  const navegar = useNavigate();

  if (!esMujer) return null;

  const hojas = [
    {
      ruta: '/ficha-prenatal',
      titulo: 'Control prenatal',
      nota: 'Paginas 1 y 2 de la hoja del MSPAS',
    },
    {
      ruta: '/ficha-posparto',
      titulo: 'Evaluacion del posparto',
      nota: 'Paginas 3 y 4, con sus propios signos de peligro',
    },
  ];

  return (
    <>
      <Button size="small" color="inherit" onClick={(e) => setAncla(e.currentTarget)}>
        Prenatal o posparto
      </Button>

      <Menu anchorEl={ancla} open={Boolean(ancla)} onClose={() => setAncla(null)}>
        {hojas.map((h) => (
          <MenuItem
            key={h.ruta}
            onClick={() => {
              setAncla(null);
              navegar('/pacientes/' + pacienteId + h.ruta);
            }}
          >
            <ListItemText primary={h.titulo} secondary={h.nota} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/**
 * Como se llama cada hoja, para nombrarla en el aviso.
 *
 * Son cinco nombres para cuatro hojas oficiales: la evaluacion del posparto es
 * su propio tipo de ficha, porque el papel le da encabezado, numeracion y
 * signos de peligro propios. Ver `docs/diseno-ficha-prenatal.md`.
 */
const NOMBRE: Record<TipoFicha, string> = {
  ADULTO: 'Adolescente, adulto y adulto mayor',
  NEONATO: 'Menor de 28 dias',
  NINEZ: 'Lactancia y ninez',
  PRENATAL: 'Prenatal',
  POSPARTO: 'Evaluacion del posparto',
};

/**
 * Aviso de que esta hoja no es la que le toca por edad.
 *
 * **Avisa, no bloquea.** La ficha de adulto si bloqueaba, y eso rompe dos
 * cosas reales: el CAP transcribe expedientes de papel, y una consulta de hace
 * tres anos se llena con la edad que el nino tenia entonces; y en los limites
 * —un nino de nueve anos y once meses— quien conoce el caso decide mejor que
 * un corte de edad.
 *
 * Lo que no puede pasar es que la eleccion sea invisible: el aviso se queda
 * puesto mientras se llena, con el camino a la hoja que si corresponde a un
 * clic.
 */
export function AvisoDeEdad({
  fechaNacimiento,
  pacienteId,
  nombres,
  tipoDeEstaFicha,
}: {
  fechaNacimiento: string;
  pacienteId: string;
  nombres: string;
  tipoDeEstaFicha: TipoFicha;
}) {
  const suya: FichaSugerida = fichaParaPaciente(fechaNacimiento, pacienteId);
  if (suya.tipo === tipoDeEstaFicha) return null;

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        suya.ruta ? (
          <Button component={EnlaceRuta} to={suya.ruta} size="small" color="inherit">
            Abrir la de {suya.nombre.toLowerCase()}
          </Button>
        ) : null
      }
    >
      <Typography variant="body2">
        Esta es la ficha de <strong>{NOMBRE[tipoDeEstaFicha].toLowerCase()}</strong>, y a{' '}
        {nombres} le corresponde la de <strong>{suya.nombre.toLowerCase()}</strong>:{' '}
        {suya.motivo.toLowerCase()}. Si esta transcribiendo una consulta antigua, continue.
      </Typography>
    </Alert>
  );
}
