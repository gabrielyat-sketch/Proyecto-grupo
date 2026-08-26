import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Stack, TextField } from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { entrar, type ResultadoEntrada } from './servicio-sesion';

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
    formState: { errors, isSubmitting },
  } = useForm<Campos>({ resolver: zodResolver(esquema), defaultValues: { usuario: '', contrasena: '' } });

  async function enviar(campos: Campos) {
    setError(null);
    try {
      alAvanzar(await entrar(campos.usuario, campos.contrasena));
    } catch (e) {
      setError(e);
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate>
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
          {...register('usuario')}
        />

        <TextField
          label="Contrasena"
          type="password"
          autoComplete="current-password"
          error={Boolean(errors.contrasena)}
          helperText={errors.contrasena?.message}
          {...register('contrasena')}
        />

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </Stack>
    </form>
  );
}
