import { Box, Checkbox, Collapse, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import type { FilaProblema } from './borrador';
import type { ProblemaCatalogo } from './servicio-fichas';
import { SelectorSiNo } from './SelectorRespuesta';

/**
 * La matriz "Revision de problemas": catorce filas, y cada una con su propia
 * lista de signos y de diagnosticos.
 *
 * En el papel las tres columnas estan siempre a la vista y el medico subraya lo
 * que corresponde. Dibujarlas asi en pantalla darian 65 signos y 49
 * diagnosticos abiertos a la vez —mas de cien casillas para una consulta que
 * normalmente toca uno o dos problemas— y encontrar el que se busca costaria
 * mas que en el papel.
 *
 * Por eso cada fila se abre solo al marcarla como presente. Es la misma
 * informacion y el mismo orden; lo que cambia es que lo que no aplica no
 * estorba. Al marcar NO la fila se cierra pero NO se borra lo que hubiera
 * dentro: quien se equivoco de fila y vuelve atras no pierde lo que ya subrayo.
 */
export function MatrizProblemas({
  problemas,
  valores,
  onCambio,
}: {
  problemas: readonly ProblemaCatalogo[];
  valores: Record<string, FilaProblema>;
  onCambio: (problemaId: string, fila: FilaProblema) => void;
}) {
  return (
    <Stack sx={{ gap: 1 }}>
      {problemas.map((p, i) => {
        const fila = valores[p.id];
        if (!fila) return null;

        const alternar = (campo: 'signoIds' | 'diagnosticoIds', id: string) => {
          const actuales = fila[campo];
          const nuevos = actuales.includes(id)
            ? actuales.filter((x) => x !== id)
            : [...actuales, id];
          onCambio(p.id, { ...fila, [campo]: nuevos });
        };

        const pideOtro = p.diagnosticos.some(
          (d) => d.pideTexto && fila.diagnosticoIds.includes(d.id),
        );

        return (
          <Box
            key={p.id}
            sx={{
              border: '1px solid',
              borderColor: fila.presente ? 'primary.main' : 'divider',
              borderRadius: 0.5,
            }}
          >
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                bgcolor: fila.presente ? 'action.hover' : 'transparent',
              }}
            >
              <Typography
                aria-hidden
                sx={{
                  minWidth: 24,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {i + 1}
              </Typography>

              <Typography
                sx={{ flex: 1, fontWeight: fila.presente ? 600 : 400, lineHeight: 1.35 }}
              >
                {p.nombre}
              </Typography>

              <SelectorSiNo
                valor={fila.presente}
                etiqueta={p.nombre}
                onCambio={(v) => onCambio(p.id, { ...fila, presente: v })}
              />
            </Stack>

            <Collapse in={fila.presente === true} unmountOnExit>
              <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ gap: 3 }}>
                  <ListaOpciones
                    titulo="Evaluar: signos"
                    vacio="Este problema no trae signos en el formulario."
                    opciones={p.signos}
                    marcados={fila.signoIds}
                    onAlternar={(id) => alternar('signoIds', id)}
                  />
                  <ListaOpciones
                    titulo="Clasificar: diagnostico"
                    vacio="Este problema no trae diagnosticos en el formulario."
                    opciones={p.diagnosticos}
                    marcados={fila.diagnosticoIds}
                    onAlternar={(id) => alternar('diagnosticoIds', id)}
                  />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mt: 2 }}>
                  {pideOtro ? (
                    <TextField
                      label="Cual"
                      size="small"
                      value={fila.otroDiagnostico}
                      onChange={(e) => onCambio(p.id, { ...fila, otroDiagnostico: e.target.value })}
                      helperText="Lo que en el papel se escribe en la linea de 'Otro'"
                    />
                  ) : null}
                  <TextField
                    label="Conducta"
                    size="small"
                    value={fila.conducta}
                    onChange={(e) => onCambio(p.id, { ...fila, conducta: e.target.value })}
                    helperText="Que se hizo o se indico para este problema"
                  />
                </Stack>
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Stack>
  );
}

/**
 * Las opciones que en el papel se subrayan.
 *
 * En columnas y sin separacion vertical: es una lista para recorrer con la
 * vista buscando una palabra, no un menu de acciones. El espaciado generoso que
 * ayuda en un formulario corto aqui obligaria a desplazar la pantalla para leer
 * doce opciones.
 */
function ListaOpciones({
  titulo,
  vacio,
  opciones,
  marcados,
  onAlternar,
}: {
  titulo: string;
  vacio: string;
  opciones: readonly { id: string; texto: string }[];
  marcados: readonly string[];
  onAlternar: (id: string) => void;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        component="h4"
        sx={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          mb: 0.5,
        }}
      >
        {titulo}
      </Typography>

      {opciones.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {vacio}
        </Typography>
      ) : (
        <Box sx={{ columnCount: { xs: 1, md: 2, lg: 1, xl: 2 }, columnGap: 3 }}>
          {opciones.map((o) => (
            <FormControlLabel
              key={o.id}
              sx={{
                display: 'flex',
                breakInside: 'avoid',
                mx: 0,
                my: 0,
                '& .MuiFormControlLabel-label': { fontSize: 14, lineHeight: 1.3 },
              }}
              control={
                <Checkbox
                  size="small"
                  checked={marcados.includes(o.id)}
                  onChange={() => onAlternar(o.id)}
                  sx={{ py: 0.25 }}
                />
              }
              label={o.texto}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
