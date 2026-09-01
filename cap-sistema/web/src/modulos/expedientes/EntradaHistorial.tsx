import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import {
  imcDe,
  NOMBRE_FICHA,
  obtenerFicha,
  presion,
  type Atencion,
} from './servicio-expedientes';

const fechaLarga = (valor: string) =>
  new Date(valor).toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const hora = (valor: string) =>
  new Date(valor).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

/**
 * Una atencion del historial.
 *
 * Los signos vitales van SIEMPRE a la vista, no escondidos tras un despliegue.
 * Un expediente de papel se hojea y los numeros se leen de corrido: es asi como
 * se ve que la presion viene subiendo tres controles seguidos. Guardarlos
 * detras de un clic obligaria a abrir diez atenciones para notar lo que en el
 * papel salta a la vista.
 *
 * Lo que si se despliega es la ficha completa —sus problemas, signos y
 * diagnosticos—, que son decenas de renglones y solo se miran cuando interesa
 * esa consulta en concreto. Se pide al servidor al abrirla, no antes.
 */
export function EntradaHistorial({ atencion }: { atencion: Atencion }) {
  const [abierta, setAbierta] = useState(false);
  const esFicha = atencion.tipoFicha !== null;

  const ficha = useQuery({
    queryKey: ['ficha', atencion.id],
    queryFn: () => obtenerFicha(atencion.id),
    // Solo se pide cuando alguien la abre. Cargarlas todas por si acaso serian
    // decenas de peticiones para mirar una.
    enabled: abierta && esFicha,
    staleTime: 5 * 60_000,
  });

  const imc = imcDe(atencion.pesoKg, atencion.tallaCm);
  const pa = presion(atencion.presionSistolica, atencion.presionDiastolica);

  const vitales: { rotulo: string; valor: string }[] = [];
  if (atencion.pesoKg) vitales.push({ rotulo: 'Peso', valor: atencion.pesoKg + ' kg' });
  if (atencion.tallaCm) vitales.push({ rotulo: 'Talla', valor: atencion.tallaCm + ' cm' });
  if (imc !== null) vitales.push({ rotulo: 'IMC', valor: imc.toFixed(2) });
  if (pa) vitales.push({ rotulo: 'Presion', valor: pa });
  if (atencion.temperaturaC) vitales.push({ rotulo: 'Temp.', valor: atencion.temperaturaC + ' C' });

  return (
    <Box
      component="article"
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: { xs: 1.5, md: 2 } }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 1, alignItems: { md: 'baseline' }, justifyContent: 'space-between', mb: 1 }}
      >
        <Stack direction="row" sx={{ gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography component="h3" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {fechaLarga(atencion.fecha)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hora(atencion.fecha)}
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ gap: 1 }}>
          {atencion.digitalizada ? (
            <Chip
              size="small"
              variant="outlined"
              label="Del papel"
              title="Transcrita de un expediente en papel"
            />
          ) : null}
          {esFicha ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={'Ficha ' + (NOMBRE_FICHA[atencion.tipoFicha!] ?? atencion.tipoFicha)}
            />
          ) : null}
        </Stack>
      </Stack>

      {atencion.motivo ? (
        <Typography sx={{ mb: 1 }}>{atencion.motivo}</Typography>
      ) : null}

      {vitales.length > 0 ? (
        <Stack
          direction="row"
          sx={{ gap: 2.5, flexWrap: 'wrap', mb: atencion.diagnostico ? 1 : 0 }}
        >
          {vitales.map((v) => (
            <Stack key={v.rotulo} direction="row" sx={{ gap: 0.6, alignItems: 'baseline' }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                {v.rotulo}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {v.valor}
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : null}

      {atencion.diagnostico ? (
        <Dato titulo="Diagnostico" texto={atencion.diagnostico} />
      ) : null}
      {atencion.tratamiento ? (
        <Dato titulo="Tratamiento" texto={atencion.tratamiento} />
      ) : null}
      {atencion.notas ? <Dato titulo="Notas" texto={atencion.notas} /> : null}

      {esFicha ? (
        <>
          <Button
            size="small"
            onClick={() => setAbierta((v) => !v)}
            sx={{ mt: 1, px: 0, minWidth: 0 }}
            aria-expanded={abierta}
          >
            {abierta ? 'Ocultar la ficha' : 'Ver la ficha completa'}
          </Button>

          {abierta ? (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {ficha.isLoading ? (
                <Stack sx={{ alignItems: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : ficha.isError ? (
                <AvisoError error={ficha.error} />
              ) : ficha.data ? (
                <CuerpoFicha ficha={ficha.data} />
              ) : null}
            </Box>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}

function Dato({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {titulo}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {texto}
      </Typography>
    </Box>
  );
}

/** El contenido de la ficha oficial: lo que en el papel se subrayo. */
/** Como se dice cada forma de atender el parto. */
const QUIEN_ATENDIO: Record<string, string> = {
  MEDICO: 'Medico',
  ENFERMERA: 'Enfermera',
  COMADRONA: 'Comadrona',
  FAMILIAR: 'Familiar',
  OTRO: 'Otro',
};

const TIPO_PARTO: Record<string, string> = {
  EUTOCICO: 'Eutocico',
  DISTOCICO: 'Distocico',
  CESAREA: 'Cesarea',
};

/** El peso como lo escribe el papel: libras y onzas, no kilos. */
function peso(libras: number | null, onzas: number | null): string | null {
  if (libras === null && onzas === null) return null;
  return (libras ?? 0) + ' lb ' + (onzas ?? 0) + ' oz';
}

const siNo = (v: boolean | null) => (v === null ? null : v ? 'Si' : 'No');

/**
 * El bloque de la ficha de menor de 28 dias, en el historial.
 *
 * No estaba, y eso hacia invisible todo lo que solo vive en esa hoja: el
 * nombre de la madre, el peso al nacer, quien atendio el parto, la BCG. Media
 * ficha se guardaba y no se podia volver a leer.
 */
function BloqueNeonato({ n }: { n: NonNullable<FichaGuardada['neonato']> }) {
  const filas: { titulo: string; texto: string | null }[] = [
    { titulo: 'Nombre de la madre', texto: n.nombreMadre },
    { titulo: 'Peso', texto: peso(n.pesoLibras, n.pesoOnzas) },
    { titulo: 'Peso al nacer', texto: peso(n.pesoNacerLibras, n.pesoNacerOnzas) },
    {
      titulo: 'Perimetro braquial',
      texto: n.perimetroBraquialCm ? n.perimetroBraquialCm + ' cm' : null,
    },
    {
      titulo: 'Circunferencia cefalica',
      texto: n.circunferenciaCefalicaCm ? n.circunferenciaCefalicaCm + ' cm' : null,
    },
    { titulo: 'Lloro al nacer', texto: siNo(n.lloroAlNacer) },
    { titulo: 'Nacio cianotico', texto: siNo(n.nacioCianotico) },
    {
      titulo: 'Horas de trabajo de parto',
      texto: n.horasTrabajoParto === null ? null : String(n.horasTrabajoParto),
    },
    {
      titulo: 'Quien atendio el parto',
      texto: n.quienAtendioParto
        ? (QUIEN_ATENDIO[n.quienAtendioParto] ?? n.quienAtendioParto) +
          (n.quienAtendioPartoOtro ? ': ' + n.quienAtendioPartoOtro : '')
        : null,
    },
    { titulo: 'Tipo de parto', texto: n.tipoParto ? (TIPO_PARTO[n.tipoParto] ?? n.tipoParto) : null },
    { titulo: 'Ruptura prematura de membranas', texto: siNo(n.rupturaPrematuraMembranas) },
    { titulo: 'Trabajo de parto prematuro', texto: siNo(n.trabajoPartoPrematuro) },
    { titulo: 'Parto prolongado', texto: siNo(n.partoProlongado) },
    { titulo: 'BCG', texto: siNo(n.bcg) },
    {
      titulo: 'Td en la madre',
      texto:
        n.tdMadre === null
          ? null
          : n.tdMadre
            ? 'Si' + (n.tdMadreDosis !== null ? ', ' + n.tdMadreDosis + ' dosis' : '')
            : 'No',
    },
  ].filter((f) => f.texto !== null && f.texto !== '');

  if (filas.length === 0) return null;

  return (
    <Box>
      <Rotulo>Datos de la madre y del parto</Rotulo>
      {filas.map((f) => (
        <Dato key={f.titulo} titulo={f.titulo} texto={f.texto!} />
      ))}
    </Box>
  );
}

type FichaGuardada = NonNullable<
  ReturnType<typeof obtenerFicha> extends Promise<infer T> ? T : never
>;

function CuerpoFicha({ ficha }: { ficha: FichaGuardada }) {
  const peligros = ficha.signosPeligro.filter((s) => s.presente);
  const problemas = ficha.problemas.filter((p) => p.presente);

  return (
    <Stack sx={{ gap: 1.5 }}>
      {/*
        Lo que solo trae la ficha de menor de 28 dias.

        Se guardaba desde el primer dia —el panel lo envia, el servidor lo cifra
        y la API lo devuelve— pero esta pantalla nunca lo dibujaba: solo pintaba
        los campos comunes. Desde fuera eso no se distingue de que no se
        guardara, y quien lo llenaba concluia, con razon, que se perdia.

        Va PRIMERO porque en esta ficha el paciente es el nino y casi todo lo de
        aqui es de la madre y del parto: es el contexto con el que se lee el
        resto.
      */}
      {ficha.neonato ? <BloqueNeonato n={ficha.neonato} /> : null}

      {peligros.length > 0 ? (
        <Box>
          <Rotulo>Signos de peligro</Rotulo>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
            {peligros.map((s) => (
              <Chip
                key={s.signoId}
                size="small"
                color="warning"
                label={s.texto + (s.detalle ? ': ' + s.detalle : '')}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      {ficha.historiaEnfermedad ? (
        <Dato titulo="Historia de la enfermedad" texto={ficha.historiaEnfermedad} />
      ) : null}

      {problemas.length > 0 ? (
        <Box>
          <Rotulo>Problemas encontrados</Rotulo>
          <Stack sx={{ gap: 1, mt: 0.75 }}>
            {problemas.map((p) => (
              <Box
                key={p.problemaId}
                sx={{ borderLeft: '2px solid', borderColor: 'primary.main', pl: 1.25 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {p.nombre}
                </Typography>
                {p.signos.length > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Signos: {p.signos.join(' · ')}
                  </Typography>
                ) : null}
                {p.diagnosticos.length > 0 || p.otroDiagnostico ? (
                  <Typography variant="body2">
                    Diagnostico:{' '}
                    {[...p.diagnosticos, p.otroDiagnostico].filter(Boolean).join(' · ')}
                  </Typography>
                ) : null}
                {p.conducta ? (
                  <Typography variant="body2" color="text.secondary">
                    Conducta: {p.conducta}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      {ficha.medicamentos.length > 0 ? (
        <Box>
          <Rotulo>Medicamentos indicados</Rotulo>
          <Stack component="ul" sx={{ gap: 0.25, m: 0, mt: 0.5, pl: 2.5 }}>
            {ficha.medicamentos.map((m, i) => (
              <Typography key={i} component="li" variant="body2">
                {m.nombre}
                {m.dosis ? ' — ' + m.dosis : ''}
                {m.dias ? ' — ' + m.dias + ' dias' : ''}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      {ficha.consejeria ? <Dato titulo="Consejeria" texto={ficha.consejeria} /> : null}
      {ficha.referencia ? <Dato titulo="Referido a" texto={ficha.referencia} /> : null}
      {ficha.vacunaAdministrada ? (
        <Dato titulo="Vacuna administrada" texto={ficha.vacunaAdministrada} />
      ) : null}

      {peligros.length === 0 &&
      problemas.length === 0 &&
      ficha.medicamentos.length === 0 &&
      !ficha.historiaEnfermedad &&
      !ficha.consejeria ? (
        <>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            De esta ficha solo se lleno el motivo de la consulta.
          </Typography>
        </>
      ) : null}
    </Stack>
  );
}

function Rotulo({ children }: { children: string }) {
  return (
    <Typography
      component="h4"
      sx={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {children}
    </Typography>
  );
}
