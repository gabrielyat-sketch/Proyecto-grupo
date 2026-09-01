import { useState } from 'react';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

/**
 * Campo de contrasena con la opcion de verla.
 *
 * No es comodidad: el personal del CAP tiene distinto nivel de alfabetizacion
 * digital, y una contrasena escrita a ciegas se equivoca sin que la persona
 * sepa donde. Sin poder verla, el unico camino es borrar todo y reintentar,
 * hasta que la cuenta se bloquea por intentos fallidos.
 *
 * Empieza siempre oculta. En el CAP las computadoras estan a la vista del
 * publico que espera, asi que mostrarla debe ser una decision consciente.
 */
export function CampoContrasena({ slotProps, ...props }: TextFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        ...slotProps,
        input: {
          ...slotProps?.input,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                // El boton se anuncia por lo que HACE, no por lo que muestra:
                // quien usa lector de pantalla necesita saber la accion.
                aria-label={visible ? 'Ocultar la contrasena' : 'Mostrar la contrasena'}
                onClick={() => setVisible((v) => !v)}
                // Sin esto, el boton se enviaria al pulsar Enter dentro del
                // formulario en vez de enviar el formulario.
                type="button"
                edge="end"
              >
                {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
