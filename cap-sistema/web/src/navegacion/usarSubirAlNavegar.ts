import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Cada pantalla empieza por arriba.
 *
 * El navegador conserva el desplazamiento al cambiar de ruta —no hay recarga
 * que lo reinicie—, asi que al salir de una ficha de doscientos campos por el
 * boton de guardar se llegaba al expediente a media pagina, con el encabezado
 * fuera de vista y sin nada que explicara por que. Lo mismo al abrir un
 * paciente desde el final de una lista larga.
 *
 * La ficha de adultos ya lo remediaba por su cuenta con un `scrollTo` al
 * montar, lo que dice que el problema estaba visto; esto lo resuelve de una
 * vez para todas las pantallas y no una por una segun se vaya notando.
 *
 * Sin animacion, a proposito. Deslizar suavemente al cambiar de pantalla hace
 * esperar a que termine el viaje para poder leer. La animacion se reserva para
 * cuando la pantalla NO cambia y hay que entender que algo se movio: guardar
 * una ficha, por ejemplo, sube al aviso de guardado deslizandose para que se
 * vea de donde vino.
 */
export function usarSubirAlNavegar(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
}
