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

/**
 * Los metodos impresos en la ficha, en el orden del papel.
 *
 * Es una lista cerrada y no un campo de texto: escrito a mano, el mismo metodo
 * aparece como "inyeccion", "Inyectable" y "depo", y despues ningun reporte de
 * cobertura de planificacion familiar puede sumarlos.
 */
const METODOS = ['Pildora', 'Inyeccion', 'Condon', 'T de cobre', 'AQV', 'Otro'];

/**
 * Antecedentes gineco-obstetricos de la ficha de ADULTOS.
 *
 * Solo lo que esta impreso en esta hoja: FUR, gestas, partos, abortos, la
 * deteccion de cancer de cervix, el metodo de planificacion familiar y el tipo
 * de sangre.
 *
 * Las cuentas de cesareas, legrados, nacidos vivos y muertos, preeclampsia y
 * demas NO van aqui: pertenecen a la ficha PRENATAL, que las trae impresas.
 * El modelo de datos las guarda —son las mismas columnas para las dos fichas—
 * pero pedirlas en una consulta de adulto seria inventarle campos al formulario
 * oficial, y lo que se capture asi no tiene respaldo en ningun papel firmado.
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
          sx={{ maxWidth: { sm: 260 } }}
        />
        <TextField
          label="Gestas"
          size="small"
          inputMode="numeric"
          value={valores.gestas}
          onChange={(e) => cambiar('gestas', e.target.value)}
        />
        <TextField
          label="Partos"
          size="small"
          inputMode="numeric"
          value={valores.partos}
          onChange={(e) => cambiar('partos', e.target.value)}
        />
        <TextField
          label="Abortos"
          size="small"
          inputMode="numeric"
          value={valores.abortos}
          onChange={(e) => cambiar('abortos', e.target.value)}
        />
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 2, alignItems: { md: 'flex-start' } }}
      >
        <TextField
          select
          label="Deteccion de cancer de cervix"
          size="small"
          value={valores.tamizajeCervix}
          onChange={(e) => cambiar('tamizajeCervix', e.target.value)}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: { md: 240 } }}
        >
          <option value="">Sin registrar</option>
          <option value="PAPANICOLAU">Papanicolau</option>
          <option value="IVAA">IVAA</option>
        </TextField>
        <TextField
          label="Fecha"
          type="date"
          size="small"
          value={valores.tamizajeFecha}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy() } }}
          onChange={(e) => cambiar('tamizajeFecha', e.target.value)}
          sx={{ maxWidth: { md: 200 } }}
        />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <LineaPregunta texto="Resultado normal">
            <SelectorSiNo
              valor={valores.tamizajeNormal}
              etiqueta="Resultado del tamizaje normal"
              denso
              onCambio={(v) => cambiar('tamizajeNormal', v)}
            />
          </LineaPregunta>
        </Box>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 2, alignItems: { md: 'flex-start' } }}
      >
        <Box sx={{ minWidth: { md: 280 } }}>
          <LineaPregunta texto="Usa metodo de planificacion familiar">
            <SelectorSiNo
              valor={valores.usaPlanificacion}
              etiqueta="Usa metodo de planificacion familiar"
              denso
              onCambio={(v) => cambiar('usaPlanificacion', v)}
            />
          </LineaPregunta>
        </Box>
        {/* El "cual" del papel: solo tiene sentido si la respuesta fue que si. */}
        <Collapse in={valores.usaPlanificacion === true} unmountOnExit sx={{ flex: 1 }}>
          <TextField
            select
            label="Cual"
            size="small"
            value={valores.metodoPlanificacion}
            onChange={(e) => cambiar('metodoPlanificacion', e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: { md: 200 } }}
          >
            <option value="">Sin registrar</option>
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </TextField>
        </Collapse>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, alignItems: { md: 'flex-start' } }}>
        <TextField
          select
          label="Tipo de sangre"
          size="small"
          value={valores.tipoSangre}
          onChange={(e) => cambiar('tipoSangre', e.target.value)}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: { md: 180 } }}
        >
          <option value="">Sin registrar</option>
          {['O', 'A', 'B', 'AB'].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </TextField>
        <Box sx={{ minWidth: 200 }}>
          <LineaPregunta texto="Factor RH">
            <SelectorRespuesta
              valor={valores.rhPositivo === null ? null : valores.rhPositivo ? 'MAS' : 'MENOS'}
              etiqueta="Factor RH"
              denso
              opciones={[
                { valor: 'MAS', letra: 'p', etiqueta: 'RH +' },
                { valor: 'MENOS', letra: 'n', etiqueta: 'RH -' },
              ]}
              onCambio={(v) => cambiar('rhPositivo', v === null ? null : v === 'MAS')}
            />
          </LineaPregunta>
        </Box>
      </Stack>
    </Stack>
  );
}
