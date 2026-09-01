import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, InputAdornment, Stack, TextField } from '@mui/material';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { AvisoError } from '../../componentes/AvisoError';
import { CampoContrasena } from '../../componentes/CampoContrasena';
import { entrar, type ResultadoEntrada } from './servicio-sesion';
import { BOTON_ENTRAR } from '../../tema';

// Reglas minimas: el servidor es quien valida de verdad. Aqui solo se evita
// mandar una peticion que ya se sabe incompleta.
const esquema = z.object({
  usuario: z.string().trim().min(1, 'Escriba su usuario'),
  contrasena: z.string().min(1, 'Escriba su contrasena'),
});

type Campos = z.infer<typeof esquema>;

export function PasoCredenciales({ alAvanzar }: { alAvanzar: (r: ResultadoEntrada) => void }) {
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({ resolver: zodResolver(esquema), defaultValues: { usuario: '', contrasena: '' } });

  /**
   * En cuanto la persona corrige algo, el formulario vuelve a estado neutro.
   *
   * Sin esto, tras un intento fallido todo queda en rojo y el mensaje de error
   * sigue en pantalla mientras se escribe de nuevo: parece que el sistema
   * siguiera rechazando lo que se esta escribiendo ahora.
   */
  function limpiarAvisos() {
    setError(null);
    clearErrors();
  }

  async function enviar(campos: Campos) {
    setError(null);
    try {
      alAvanzar(await entrar(campos.usuario, campos.contrasena));
    } catch (e) {
      setError(e);
    }
  }

  /**
   * Iconos de los campos. Son decorativos —MUI ya los marca `aria-hidden`— y
   * su trabajo es que el par usuario/contrasena se distinga de un vistazo sin
   * tener que leer las etiquetas, que es como lo mira alguien que entra al
   * sistema varias veces al dia.
   */
  const iconoInicial = (icono: ReactNode) => ({
    startAdornment: (
      <InputAdornment position="start" sx={{ color: 'text.disabled' }}>
        {icono}
      </InputAdornment>
    ),
  });

  // onChange en el formulario, no campo por campo: el evento de cualquier
  // entrada burbujea hasta aqui y no hay que envolver los register.
  return (
    <form onSubmit={handleSubmit(enviar)} onChange={limpiarAvisos} noValidate>
      <Stack spacing={2.5}>
        <AvisoError error={error} />

        <TextField
          label="Usuario"
          // El foco entra solo: quien llega a esta pantalla no viene a leerla,
          // viene a escribir. Un campo enfocado ahorra el viaje al mouse.
          autoFocus
          autoComplete="username"
          error={Boolean(errors.usuario)}
          helperText={errors.usuario?.message}
          slotProps={{ input: iconoInicial(<PersonOutlinedIcon fontSize="small" />) }}
          {...register('usuario')}
        />

        <CampoContrasena
          label="Contrasena"
          autoComplete="current-password"
          error={Boolean(errors.contrasena)}
          helperText={errors.contrasena?.message}
          slotProps={{ input: iconoInicial(<KeyOutlinedIcon fontSize="small" />) }}
          {...register('contrasena')}
        />

        <Button type="submit" variant="contained" size="large" sx={BOTON_ENTRAR} disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </Stack>
    </form>
  );
}
