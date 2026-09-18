import { Link as EnlaceRuta } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link, Skeleton, Stack, Typography } from '@mui/material';
import { desde } from '../../navegacion/usarVolver';
import { obtenerPaciente } from '../fichas/servicio-fichas';

/**
 * El nombre de un paciente a partir de su identificador.
 *
 * **Por que hace falta esto.** Los listados de Programas traen `pacienteId` y
 * `comunidadId`, pero no el nombre: el servicio de programas guarda el
 * seguimiento clinico y pide los datos de la persona a `usuarios` cuando los
 * necesita. Una lista de seguimientos que muestra identificadores no sirve
 * para nada —nadie busca a «8f3a-…» en el archivero— asi que el nombre se
 * resuelve aqui.
 *
 * **Lo que cuesta.** Una peticion por fila visible: veinticinco por pagina la
 * primera vez, y ninguna despues porque quedan en cache media hora. En una red
 * local del CAP eso es aceptable; en una conexion mala no lo seria.
 *
 * **Lo correcto seria que el listado trajera el nombre.** Eso es un cambio en
 * `programas`, que tendria que preguntarle a `usuarios` por los pacientes de
 * la pagina de una sola vez —y hoy su cliente pregunta de uno en uno, asi que
 * antes habria que anadir una consulta por lotes—. Queda anotado: mientras
 * tanto, esta version funciona y se ve igual.
 */
export function NombrePaciente({ pacienteId }: { pacienteId: string }) {
  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    // La misma clave que usan las fichas: si ya se abrio el expediente, el
    // nombre sale de la cache y no se pide nada.
    staleTime: 30 * 60_000,
  });

  if (paciente.isPending) return <Skeleton width={160} />;

  if (paciente.isError) {
    // No se cae la fila entera por un nombre: el seguimiento clinico que hay
    // al lado sigue siendo legible y util.
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
        {pacienteId.slice(0, 8)}…
      </Typography>
    );
  }

  const p = paciente.data;
  return (
    <Stack sx={{ gap: 0.25, minWidth: 0 }}>
      <Link
        component={EnlaceRuta}
        to={'/pacientes/' + pacienteId + '/expediente'}
        state={desde('/programas', 'Programas')}
        sx={{ fontWeight: 600 }}
      >
        {p.apellidos}, {p.nombres}
      </Link>
      <Typography variant="caption" color="text.secondary">
        {p.edad} anos · {p.comunidad?.nombre}
      </Typography>
    </Stack>
  );
}
