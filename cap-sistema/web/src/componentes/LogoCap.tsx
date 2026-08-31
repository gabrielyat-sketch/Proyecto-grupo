import { Box } from '@mui/material';

/**
 * Marca del CAP: la cruz de salud con el brote dentro.
 *
 * Es el logo oficial, un PNG con fondo transparente. Antes esto era un SVG
 * dibujado a mano que se pintaba con el color heredado, y en el acceso salia
 * negro: iba al lado del titulo, no dentro de el, asi que heredaba el color del
 * texto normal en vez del azul de la marca.
 *
 * El contorno blanco del logo lo hace legible tanto sobre la tarjeta blanca del
 * acceso como sobre la barra teal del panel, que son los dos sitios donde va.
 *
 * Es decorativo: siempre viaja al lado del texto "CAP Purulha", asi que se
 * oculta a los lectores de pantalla para no leer la marca dos veces.
 */
export function LogoCap({ tamano = 32 }: { tamano?: number }) {
  return (
    <Box
      component="img"
      src="/logo-cap.png"
      alt=""
      aria-hidden="true"
      sx={{
        width: tamano,
        height: tamano,
        display: 'block',
        flexShrink: 0,
        // El PNG es cuadrado y el logo esta centrado dentro; `contain` evita
        // que un contenedor no cuadrado lo deforme.
        objectFit: 'contain',
      }}
    />
  );
}
