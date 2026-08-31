import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { activarMfaInicial, configurarMfaInicial, type ConfiguracionMfa } from './servicio-sesion';
import { BOTON_ENTRAR } from '../../tema';

/**
 * Primera configuracion del segundo factor.
 *
 * Solo la ven Administrador y Director, y solo una vez. Los codigos de respaldo
 * se muestran aqui y NO se vuelven a mostrar: si esta pantalla se cierra sin
 * anotarlos, se pierden.
 */
export function PasoConfigurarMfa({
  tokenParcial,
  alVolver,
  alEntrar,
}: {
  tokenParcial: string;
  alVolver: () => void;
  alEntrar: () => void;
}) {
  const [config, setConfig] = useState<ConfiguracionMfa | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  /**
   * La peticion en vuelo, para no lanzarla dos veces.
   *
   * StrictMode monta el componente dos veces en desarrollo, y el efecto corre
   * dos veces con el. La bandera `vigente` evita que la primera respuesta
   * pinte la pantalla, pero NO cancela la peticion: salian dos, cada una
   * generaba su propio secreto TOTP, y la ultima en escribir se quedaba en la
   * base. El QR que la persona ya habia escaneado era el de la otra, asi que
   * ningun codigo validaba nunca y el error culpaba al reloj del telefono.
   */
  const peticion = useRef<{ token: string; promesa: Promise<ConfiguracionMfa> } | null>(null);

  useEffect(() => {
    let vigente = true;

    if (peticion.current?.token !== tokenParcial) {
      peticion.current = { token: tokenParcial, promesa: configurarMfaInicial(tokenParcial) };
    }

    peticion.current.promesa
      .then(async (c) => {
        if (!vigente) return;
        setConfig(c);
        // El QR se dibuja en el navegador. Mandar la URI a un generador
        // externo entregaria el secreto del segundo factor a un tercero.
        setQr(await QRCode.toDataURL(c.uri, { margin: 1, width: 220 }));
      })
      .catch((e) => vigente && setError(e));
    return () => {
      vigente = false;
    };
  }, [tokenParcial]);

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await activarMfaInicial(tokenParcial, codigo.trim());
      alEntrar();
    } catch (err) {
      setError(err);
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  }

  if (error && !config) {
    return (
      <Stack spacing={2}>
        <AvisoError error={error} />
        <Button onClick={alVolver}>Volver</Button>
      </Stack>
    );
  }

  if (!config) {
    return (
      <Stack  sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <AvisoError error={error} />

      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        {qr ? (
          <Box
            component="img"
            src={qr}
            alt="Codigo QR para la aplicacion de autenticacion"
            sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Escanee este codigo con Google Authenticator, Authy o similar.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Si no puede escanearlo, escriba esta clave:
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
            wordBreak: 'break-all',
            textAlign: 'center',
          }}
        >
          {config.secreto}
        </Typography>
      </Stack>

      <Divider />

      <Alert severity="warning">
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Anote estos codigos de respaldo. No se vuelven a mostrar.
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', lineHeight: 1.9 }}>
          {config.codigosRespaldo.join('   ')}
        </Typography>
        <Typography variant="caption"  sx={{ display: 'block', mt: 1 }}>
          Sirven una sola vez cada uno, si pierde el telefono.
        </Typography>
      </Alert>

      <form onSubmit={activar} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Escriba el codigo que muestra su aplicacion"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            slotProps={{
              htmlInput: {
                maxLength: 6,
                style: { fontSize: '1.5rem', letterSpacing: '0.35em', textAlign: 'center' },
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={BOTON_ENTRAR}
            disabled={enviando || codigo.trim().length !== 6}
          >
            {enviando ? 'Activando...' : 'Activar y entrar'}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
