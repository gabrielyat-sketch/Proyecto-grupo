import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { buscarPacientes, type PacienteResumen } from '../recepcion/servicio-pacientes';
import { inscribirEmbarazo, inscribirHipertenso } from './servicio-programas';

/** Las semanas que lleva, contadas desde la fecha de la ultima menstruacion. */
function semanasDesde(fum: string): number | null {
  if (!fum) return null;
  const d = new Date(fum + 'T00:00:00');
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias < 0 || dias > 320) return null;
  return Math.floor(dias / 7);
}

/**
 * Inscribir a alguien en un programa.
 *
 * **El paciente se busca, no se escribe.** Un identificador tecleado a mano es
 * un error que no se nota hasta que el seguimiento sale vacio, y para entonces
 * la persona lleva meses sin control. Se elige de la busqueda, igual que en
 * recepcion.
 *
 * **En embarazo solo se pide la FUM.** De ella salen las semanas de gestacion y
 * la fecha probable de parto, y las calcula el SERVIDOR: pedirlas a mano seria
 * pedir tres datos que pueden no cuadrar entre si, y el que manda es la fecha.
 * Las semanas se muestran aqui solo para que quien inscribe vea si la fecha que
 * escribio tiene sentido antes de guardar.
 *
 * **En hipertension se piden las metas.** No son iguales para todos —un
 * diabetico o alguien con dano renal tiene metas mas bajas— y es el medico
 * quien las fija; el programa solo dice despues si se estan cumpliendo.
 */
export function DialogoInscribir({
  tipo,
  onCerrar,
}: {
  tipo: 'embarazo' | 'hipertension';
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [paciente, setPaciente] = useState<PacienteResumen | null>(null);
  const [fum, setFum] = useState('');
  const [gestacion, setGestacion] = useState('1');
  const [partos, setPartos] = useState('0');
  const [metaSistolica, setMetaSistolica] = useState('140');
  const [metaDiastolica, setMetaDiastolica] = useState('90');
  const clienteConsultas = useQueryClient();

  const busqueda = useQuery({
    queryKey: ['pacientes', 'nombre', texto.trim()],
    queryFn: () => buscarPacientes({ tipo: 'nombre', nombre: texto.trim() }, undefined, 1),
    // Desde tres letras: con menos, la busqueda devuelve medio padron.
    enabled: texto.trim().length >= 3,
  });

  const guardar = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!paciente) return;
      if (tipo === 'embarazo') {
        await inscribirEmbarazo({
          pacienteId: paciente.id,
          fum,
          numeroGestacion: Number(gestacion),
          partosPrevios: Number(partos),
        });
      } else {
        await inscribirHipertenso({
          pacienteId: paciente.id,
          metaSistolica: Number(metaSistolica),
          metaDiastolica: Number(metaDiastolica),
        });
      }
    },
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ['embarazos'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['embarazos-alto-riesgo'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['hipertensos'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['hipertensos-atrasados'] });
      onCerrar();
    },
  });

  const semanas = semanasDesde(fum);
  const falta =
    !paciente ||
    (tipo === 'embarazo' && (!fum || semanas === null)) ||
    (tipo === 'hipertension' && (!metaSistolica || !metaDiastolica));

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <DialogTitle>
        Inscribir en {tipo === 'embarazo' ? 'control prenatal' : 'el programa de hipertension'}
      </DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          {guardar.isError ? <AvisoError error={guardar.error} /> : null}

          <Autocomplete
            options={busqueda.data?.datos ?? []}
            value={paciente}
            onChange={(_e, v) => setPaciente(v)}
            inputValue={texto}
            onInputChange={(_e, v) => setTexto(v)}
            getOptionLabel={(p) => p.apellidos + ', ' + p.nombres}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            loading={busqueda.isFetching}
            noOptionsText={
              texto.trim().length < 3 ? 'Escriba al menos tres letras' : 'Nadie con ese nombre'
            }
            renderOption={(props, p) => (
              <li {...props} key={p.id}>
                <Stack sx={{ gap: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {p.apellidos}, {p.nombres}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.edad} anos · {p.comunidad?.nombre}
                  </Typography>
                </Stack>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Paciente *"
                autoFocus
                helperText="Se busca por nombre o apellido; no se escribe el identificador"
              />
            )}
          />

          {tipo === 'embarazo' ? (
            <>
              <TextField
                label="Fecha de la ultima menstruacion *"
                type="date"
                value={fum}
                onChange={(e) => setFum(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: new Date().toISOString().slice(0, 10) },
                }}
                error={Boolean(fum) && semanas === null}
                helperText={
                  fum && semanas === null
                    ? 'Esa fecha no da un embarazo en curso: revise el ano'
                    : semanas !== null
                      ? 'Serian ' + semanas + ' semanas de gestacion'
                      : 'De aqui salen las semanas y la fecha probable de parto'
                }
              />
              <Stack direction="row" sx={{ gap: 2 }}>
                <TextField
                  label="Numero de gestacion"
                  value={gestacion}
                  onChange={(e) => setGestacion(e.target.value.replace(/[^0-9]/g, ''))}
                  helperText="Incluyendo esta"
                />
                <TextField
                  label="Partos previos"
                  value={partos}
                  onChange={(e) => setPartos(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </Stack>
            </>
          ) : (
            <Stack direction="row" sx={{ gap: 2 }}>
              <TextField
                label="Meta sistolica *"
                value={metaSistolica}
                onChange={(e) => setMetaSistolica(e.target.value.replace(/[^0-9]/g, ''))}
              />
              <TextField
                label="Meta diastolica *"
                value={metaDiastolica}
                onChange={(e) => setMetaDiastolica(e.target.value.replace(/[^0-9]/g, ''))}
                helperText="140/90 es lo habitual; el medico la baja si hay dano renal o diabetes"
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={falta || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? 'Inscribiendo...' : 'Inscribir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
