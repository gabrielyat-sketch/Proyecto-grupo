import { Box, Collapse, Stack, TextField, Typography } from '@mui/material';
import type { CasillaAntecedente, Obstetricos } from './borrador';
import { hoy, porGrupo } from './borrador';
import type { AntecedenteCatalogo } from './servicio-fichas';
import { BloqueFicha } from './SeccionFicha';
import {
  LineaPregunta,
  OPCIONES_CON_NO_APLICA,
  OPCIONES_SI_NO,
  SelectorRespuesta,
  SelectorSiNo,
} from './SelectorRespuesta';

/**
 * Seccion VII. Los antecedentes del paciente.
 *
 * Se guardan APARTE de la ficha y pertenecen al paciente, no a la consulta de
 * hoy: por eso llegan ya respondidos de visitas anteriores. Lo que se ve aqui
 * en blanco es lo que nunca se ha preguntado.
 */
export function SeccionAntecedentes({
  catalogo,
  valores,
  obstetricos,
  esMujer,
  onCambio,
  onCambioObstetricos,
}: {
  catalogo: readonly AntecedenteCatalogo[];
  valores: Record<string, CasillaAntecedente>;
  obstetricos: Obstetricos;
  esMujer: boolean;
  onCambio: (id: string, casilla: CasillaAntecedente) => void;
  onCambioObstetricos: (obstetricos: Obstetricos) => void;
}) {
  return (
    <Stack sx={{ gap: 2 }}>
      {porGrupo(catalogo).map((bloque) => (
        <BloqueFicha key={bloque.grupo} titulo={bloque.titulo}>
          {bloque.filas.map((a) => {
            const casilla = valores[a.id];
            if (!casilla) return null;
            const pideAlgo = a.pideDetalle || a.pideFecha || a.pideNumero;

            return (
              <Box key={a.id}>
                <LineaPregunta texto={a.texto}>
                  <SelectorRespuesta
                    valor={casilla.respuesta}
                    etiqueta={a.texto}
                    denso
                    opciones={a.permiteNoAplica ? OPCIONES_CON_NO_APLICA : OPCIONES_SI_NO}
                    onCambio={(respuesta) => onCambio(a.id, { ...casilla, respuesta })}
                  />
                </LineaPregunta>

                {/*
                  El "cual", la fecha y la cantidad aparecen solo al responder que
                  SI. En el papel esas lineas estan siempre impresas, pero en
                  pantalla mostrarlas vacias en las 33 preguntas convertiria la
                  seccion en cien campos donde hay treinta y tres.
                */}
                {pideAlgo ? (
                  <Collapse in={casilla.respuesta === 'SI'} unmountOnExit>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      sx={{ gap: 2, pl: 2, py: 1.5, bgcolor: 'action.hover' }}
                    >
                      {a.pideDetalle ? (
                        <TextField
                          label="Cual"
                          size="small"
                          value={casilla.detalle}
                          onChange={(e) => onCambio(a.id, { ...casilla, detalle: e.target.value })}
                        />
                      ) : null}
                      {a.pideFecha ? (
                        <TextField
                          label="Fecha"
                          type="date"
                          size="small"
                          value={casilla.fecha}
                          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy() } }}
                          onChange={(e) => onCambio(a.id, { ...casilla, fecha: e.target.value })}
                          sx={{ maxWidth: { sm: 200 } }}
                        />
                      ) : null}
                      {a.pideNumero ? (
                        <TextField
                          label="Cantidad"
                          size="small"
                          inputMode="numeric"
                          value={casilla.numero}
                          onChange={(e) => onCambio(a.id, { ...casilla, numero: e.target.value })}
                          sx={{ maxWidth: { sm: 160 } }}
                        />
                      ) : null}
                    </Stack>
                  </Collapse>
                ) : null}
              </Box>
            );
          })}
        </BloqueFicha>
      ))}

      {esMujer ? (
        <BloqueFicha titulo="Antecedentes gineco-obstetricos">
          <Obstetricia valores={obstetricos} onCambio={onCambioObstetricos} />
        </BloqueFicha>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Los antecedentes gineco-obstetricos se muestran en las pacientes registradas como
          femenino.
        </Typography>
      )}
    </Stack>
  );
}

const CUENTAS = [
  ['gestas', 'Gestas'],
  ['partos', 'Partos'],
  ['abortos', 'Abortos'],
  ['cesareas', 'Cesareas'],
  ['legradosLiu', 'Legrados (LIU)'],
  ['nacidosVivos', 'Nacidos vivos'],
  ['nacidosMuertos', 'Nacidos muertos'],
  ['hijosVivos', 'Hijos vivos'],
  ['hijosMuertos', 'Hijos muertos'],
  ['prematurosAntes8Meses', 'Antes de 8 meses'],
] as const;

const CASILLAS = [
  ['abortosConsecutivos', 'Abortos consecutivos'],
  ['embarazosMultiples', 'Embarazos multiples'],
  ['preeclampsia', 'Preeclampsia o eclampsia'],
] as const;

/**
 * Las cuentas obstetricas van en una reticula de campos cortos.
 *
 * No son casillas de si o no sino numeros —gestas, partos, abortos— y de ellos
 * depende el riesgo obstetrico. Puestos como texto no se podria calcular.
 */
function Obstetricia({
  valores,
  onCambio,
}: {
  valores: Obstetricos;
  onCambio: (valores: Obstetricos) => void;
}) {
  const cambiar = (campo: keyof Obstetricos, valor: string | boolean | null) =>
    onCambio({ ...valores, [campo]: valor });

  return (
    <Stack sx={{ gap: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
        <TextField
          label="Fecha de ultima menstruacion"
          type="date"
          size="small"
          value={valores.fur}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy() } }}
          onChange={(e) => cambiar('fur', e.target.value)}
        />
        <TextField
          label="Fecha del ultimo parto"
          type="date"
          size="small"
          value={valores.fechaUltimoParto}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy() } }}
          onChange={(e) => cambiar('fechaUltimoParto', e.target.value)}
        />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 1.5,
        }}
      >
        {CUENTAS.map(([campo, etiqueta]) => (
          <TextField
            key={campo}
            label={etiqueta}
            size="small"
            inputMode="numeric"
            value={valores[campo]}
            onChange={(e) => cambiar(campo, e.target.value)}
          />
        ))}
      </Box>

      <Box>
        {CASILLAS.map(([campo, etiqueta]) => (
          <LineaPregunta key={campo} texto={etiqueta}>
            <SelectorSiNo
              valor={valores[campo]}
              etiqueta={etiqueta}
              denso
              onCambio={(v) => cambiar(campo, v)}
            />
          </LineaPregunta>
        ))}
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
        <TextField
          select
          label="Tamizaje de cervix"
          size="small"
          value={valores.tamizajeCervix}
          onChange={(e) => cambiar('tamizajeCervix', e.target.value)}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
        >
          <option value="">Sin registrar</option>
          <option value="PAPANICOLAU">Papanicolau</option>
          <option value="IVAA">IVAA</option>
        </TextField>
        <TextField
          label="Fecha del tamizaje"
          type="date"
          size="small"
          value={valores.tamizajeFecha}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy() } }}
          onChange={(e) => cambiar('tamizajeFecha', e.target.value)}
        />
        <Stack sx={{ justifyContent: 'center', minWidth: 200 }}>
          <LineaPregunta texto="Resultado normal">
            <SelectorSiNo
              valor={valores.tamizajeNormal}
              etiqueta="Resultado del tamizaje normal"
              denso
              onCambio={(v) => cambiar('tamizajeNormal', v)}
            />
          </LineaPregunta>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, alignItems: { md: 'center' } }}>
        <Stack sx={{ minWidth: 220 }}>
          <LineaPregunta texto="Usa planificacion familiar">
            <SelectorSiNo
              valor={valores.usaPlanificacion}
              etiqueta="Usa planificacion familiar"
              denso
              onCambio={(v) => cambiar('usaPlanificacion', v)}
            />
          </LineaPregunta>
        </Stack>
        <TextField
          label="Metodo"
          size="small"
          value={valores.metodoPlanificacion}
          onChange={(e) => cambiar('metodoPlanificacion', e.target.value)}
        />
        <TextField
          label="Tipo de sangre"
          size="small"
          value={valores.tipoSangre}
          onChange={(e) => cambiar('tipoSangre', e.target.value.toUpperCase())}
          sx={{ maxWidth: { md: 140 } }}
        />
        <Stack sx={{ minWidth: 160 }}>
          <LineaPregunta texto="RH positivo">
            <SelectorSiNo
              valor={valores.rhPositivo}
              etiqueta="Factor RH positivo"
              denso
              onCambio={(v) => cambiar('rhPositivo', v)}
            />
          </LineaPregunta>
        </Stack>
      </Stack>
    </Stack>
  );
}
