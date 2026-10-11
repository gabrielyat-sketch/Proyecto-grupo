import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LogoCap } from '../componentes/LogoCap';

/** Fecha de la ultima revision del texto. Cambiarla cada vez que se edite. */
const ACTUALIZADO = '6 de octubre de 2026';

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Stack spacing={1}>
      <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
        {titulo}
      </Typography>
      {children}
    </Stack>
  );
}

function Parrafo({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
      {children}
    </Typography>
  );
}

function Lista({ elementos }: { elementos: ReactNode[] }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 3 }}>
      {elementos.map((e, i) => (
        <Typography key={i} component="li" variant="body2" sx={{ lineHeight: 1.7, mb: 0.5 }}>
          {e}
        </Typography>
      ))}
    </Box>
  );
}

/**
 * Politicas de privacidad del sistema SICAP y de la app movil del CAP.
 *
 * Es publica —fuera de `RutaProtegida`— por dos razones: se enlaza desde el
 * login, donde todavia no hay sesion, y la app movil (y su ficha en la tienda)
 * necesita una direccion que cualquiera pueda abrir.
 *
 * Lo que dice tiene que ser verdad sobre el codigo. Si cambia lo que se guarda
 * —un campo nuevo del paciente, otro proveedor, la app empieza a pedir datos—
 * este texto se cambia en el mismo PR, junto con `ACTUALIZADO`.
 */
export function PaginaPrivacidad() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        px: 2,
        py: { xs: 3, sm: 6 },
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        component="main"
        sx={{
          maxWidth: 760,
          mx: 'auto',
          p: { xs: 3, sm: 5 },
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Button
              component={RouterLink}
              to="/acceso"
              size="small"
              startIcon={<ArrowBackIcon />}
              sx={{ ml: -1 }}
            >
              Volver al inicio de sesión
            </Button>
          </Box>

          <Stack spacing={1}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <LogoCap tamano={30} />
              <Typography
                variant="overline"
                color="primary"
                sx={{ letterSpacing: '0.14em', fontWeight: 700, lineHeight: 1.2 }}
              >
                CAP Purulhá
              </Typography>
            </Stack>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Políticas de privacidad
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Última actualización: {ACTUALIZADO}
            </Typography>
          </Stack>

          <Parrafo>
            Estas políticas explican qué información manejan el sistema SICAP (sicapguate.com) y la
            app móvil del Centro de Atención Permanente (CAP) de Purulhá, Baja Verapaz, para qué se
            usa y cómo se protege. Ambos fueron desarrollados como proyecto de la Universidad
            Mariano Gálvez de Guatemala para el CAP.
          </Parrafo>

          <Divider />

          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Sistema SICAP
          </Typography>

          <Seccion titulo="Quién lo usa">
            <Parrafo>
              SICAP es de uso interno: solo entra el personal del CAP con una cuenta que crea el
              administrador. Los pacientes no tienen acceso ni cuenta.
            </Parrafo>
          </Seccion>

          <Seccion titulo="Qué información se guarda">
            <Lista
              elementos={[
                'De los pacientes: nombre, CUI, fecha de nacimiento, sexo, comunidad, dirección y teléfono cuando se tienen, y los datos de la familia (por ejemplo, el esposo) que pide la ficha.',
                'La información clínica de cada atención: fichas, controles prenatales y de la niñez, programas en los que está inscrito y medicamentos entregados.',
                'Del personal: nombre, usuario, rol, la contraseña cifrada (nunca se guarda tal cual) y el segundo factor de verificación.',
                'Un registro de auditoría: quién hizo cada cambio, cuándo y desde qué dirección IP. Sirve para saber quién consultó o modificó un expediente.',
              ]}
            />
          </Seccion>

          <Seccion titulo="Para qué se usa">
            <Parrafo>
              Únicamente para la atención de los pacientes en el CAP: llevar su expediente, dar
              seguimiento a sus controles, entregar medicamentos e imprimir las fichas oficiales.
              La información no se vende, no se usa con fines comerciales y no se comparte con
              terceros, salvo cuando lo exija la ley o una autoridad de salud competente.
            </Parrafo>
          </Seccion>

          <Seccion titulo="Cómo se protege">
            <Lista
              elementos={[
                'La conexión va siempre cifrada (HTTPS).',
                'Cada persona del personal entra con su propia cuenta, contraseña y un código de verificación, y solo ve los módulos que le corresponden a su rol.',
                'La sesión se cierra sola después de un rato sin actividad.',
                'Se hacen copias de respaldo periódicas de la base de datos para no perder los expedientes.',
              ]}
            />
          </Seccion>

          <Seccion titulo="Qué se guarda en su navegador">
            <Parrafo>
              SICAP no usa cookies de publicidad ni de rastreo. En el navegador solo guarda la
              sesión abierta (se borra al cerrar la pestaña), la preferencia de menú contraído y,
              si el usuario lo elige, la marca de “equipo recordado” para no pedir el código cada
              vez.
            </Parrafo>
          </Seccion>

          <Seccion titulo="Derechos de los pacientes">
            <Parrafo>
              Cualquier paciente puede pedir en el CAP ver o corregir los datos de su expediente.
              La solicitud se hace en persona con el personal del centro.
            </Parrafo>
          </Seccion>

          <Divider />

          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            App móvil del CAP Purulhá
          </Typography>

          <Seccion titulo="Qué información recoge">
            <Lista
              elementos={[
                'No pide su nombre, teléfono ni ningún otro dato personal.',
                'No necesita cuenta ni contraseña para usarla.',
                'No guarda lo que usted lee, busca ni lo que responde en las pruebas, y no lo envía a ningún lado.',
                'No usa su ubicación, cámara, contactos ni micrófono.',
              ]}
            />
          </Seccion>

          <Seccion titulo="Avisos del CAP">
            <Parrafo>
              Los temas de salud vienen dentro de la app y funcionan sin internet. Los avisos que
              publica el CAP (por ejemplo, fechas de vacunación) se descargan desde Google Firebase
              cuando hay señal y quedan guardados en el teléfono. Para descargarlos la app no envía
              ningún dato suyo.
            </Parrafo>
          </Seccion>

          <Seccion titulo="Panel del personal">
            <Parrafo>
              La opción “Soy personal del CAP” es solo para el personal autorizado que publica los
              avisos. Ellos entran con un correo y una contraseña administrados por Firebase, y
              pueden subir fotos para los avisos desde su teléfono. Nada de esto aplica a quien
              usa la app para informarse.
            </Parrafo>
          </Seccion>

          <Seccion titulo="La app no reemplaza la consulta">
            <Parrafo>
              La app informa; no diagnostica ni indica medicamentos. Quien decide un tratamiento es
              el personal de salud que lo atiende.
            </Parrafo>
          </Seccion>

          <Divider />

          <Seccion titulo="Cambios y contacto">
            <Parrafo>
              Si estas políticas cambian, se publicará aquí la nueva versión con su fecha. Para
              cualquier duda sobre su información, acuda al CAP de Purulhá y pregunte por la
              dirección del centro.
            </Parrafo>
          </Seccion>
        </Stack>
      </Paper>
    </Box>
  );
}
