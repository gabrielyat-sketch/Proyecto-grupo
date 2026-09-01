import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Stack } from '@mui/material';
import { MarcoAcceso } from '../../componentes/MarcoAcceso';
import { AvisoError } from '../../componentes/AvisoError';
import { CampoContrasena } from '../../componentes/CampoContrasena';
import { usarSesion } from './contexto';
import { cambiarContrasena } from './servicio-sesion';

/**
 * Politica de contrasena, identica a la del servidor (CambiarContrasenaDto).
 *
 * 10 caracteres con letras y numeros. No se exigen simbolos ni mayusculas a
 * proposito: en un CAP con computadoras compartidas, una politica demasiado
 * exigente termina en contrasenas escritas en un papel pegado al monitor.
 *
 * Validar aqui no reemplaza al servidor —el guard vuelve a comprobarlo— pero
 * evita que alguien escriba una contrasena entera para que se la rechacen
 * despues del viaje de ida y vuelta.
 */
const esquema = z
  .object({
    contrasenaActual: z.string().min(1, 'Escriba su contrasena actual'),
    contrasenaNueva: z
      .string()
      .min(10, 'Debe tener al menos 10 caracteres')
      .regex(/[a-zA-Z]/, 'Debe incluir al menos una letra')
      .regex(/[0-9]/, 'Debe incluir al menos un numero'),
    confirmacion: z.string().min(1, 'Repita la contrasena nueva'),
  })
  .refine((d) => d.contrasenaNueva !== d.contrasenaActual, {
    path: ['contrasenaNueva'],
    message: 'La contrasena nueva debe ser distinta de la actual',
  })
  .refine((d) => d.contrasenaNueva === d.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contrasenas no coinciden',
  });

type Campos = z.infer<typeof esquema>;

export function PaginaCambiarContrasena() {
  const { usuario } = usarSesion();
  const [error, setError] = useState<unknown>(null);
  const navegar = useNavigate();

  const obligatorio = usuario?.debeCambiarContrasena === true;

  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { contrasenaActual: '', contrasenaNueva: '', confirmacion: '' },
  });

  async function enviar(campos: Campos) {
    setError(null);
    try {
      await cambiarContrasena(campos.contrasenaActual, campos.contrasenaNueva);
      // El servidor revoco todas las sesiones, incluida esta. Se vuelve a la
      // pantalla de acceso con el aviso, en vez de dejar un panel que va a
      // fallar solo en cuanto expire el token de acceso.
      navegar('/acceso', {
        replace: true,
        state: { aviso: 'Contrasena actualizada. Ingrese de nuevo con la contrasena nueva.' },
      });
    } catch (e) {
      setError(e);
    }
  }

  return (
    <MarcoAcceso
      titulo={obligatorio ? 'Cambie su contrasena' : 'Cambiar contrasena'}
      descripcion={
        obligatorio
          ? 'Su cuenta usa una contrasena temporal. Debe cambiarla antes de continuar.'
          : undefined
      }
    >
      <form
        onSubmit={handleSubmit(enviar)}
        // Al corregir, el formulario vuelve a estado neutro en vez de quedarse
        // todo en rojo mientras se escribe.
        onChange={() => {
          setError(null);
          clearErrors();
        }}
        noValidate
      >
        <Stack spacing={2.5}>
          <AvisoError error={error} />

          {obligatorio ? (
            <Alert severity="info">
              La contrasena que le entregaron es temporal y la conoce quien creo su cuenta.
            </Alert>
          ) : null}

          <CampoContrasena
            label="Contrasena actual"
            autoFocus
            autoComplete="current-password"
            error={Boolean(errors.contrasenaActual)}
            helperText={errors.contrasenaActual?.message}
            {...register('contrasenaActual')}
          />

          <CampoContrasena
            label="Contrasena nueva"
            autoComplete="new-password"
            error={Boolean(errors.contrasenaNueva)}
            helperText={errors.contrasenaNueva?.message ?? 'Minimo 10 caracteres, con letras y numeros'}
            {...register('contrasenaNueva')}
          />

          <CampoContrasena
            label="Repita la contrasena nueva"
            autoComplete="new-password"
            error={Boolean(errors.confirmacion)}
            helperText={errors.confirmacion?.message}
            {...register('confirmacion')}
          />

          <Alert severity="warning">
            Al cambiarla se cierran todas sus sesiones abiertas, incluida esta. Tendra que ingresar
            de nuevo.
          </Alert>

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Cambiar contrasena'}
          </Button>
        </Stack>
      </form>
    </MarcoAcceso>
  );
}
