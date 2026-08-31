import { useLocation } from 'react-router-dom';

/**
 * A donde vuelve el boton de salir de una pantalla de detalle.
 *
 * El problema que resuelve: a un expediente se llega desde DOS sitios —la
 * busqueda de recepcion y el listado de expedientes— y el boton de volver
 * apuntaba siempre al mismo. Quien entraba desde Expedientes salia a
 * Recepcion, en otro modulo, y tenia que volver a navegar hasta donde estaba.
 * Lo mismo pasa con un medicamento, al que se llega desde el catalogo y desde
 * las alertas.
 *
 * La solucion no es adivinar: es que quien abre la pantalla diga de donde
 * viene. El enlace lleva `state={{ volverA: '/expedientes' }}` y aqui se lee.
 *
 * `porDefecto` cubre los dos casos en que no hay estado: alguien que llego por
 * un enlace directo, y una recarga de la pagina. No se usa `navigate(-1)`
 * justamente por eso —sin historial, retroceder saca del sistema— ni tampoco
 * el `document.referrer`, que no existe dentro de una aplicacion de una sola
 * pagina.
 */
export interface DestinoVolver {
  /** La ruta a la que se vuelve. */
  a: string;
  /** Como se llama ese sitio, para escribirlo en el boton. */
  etiqueta: string;
}

export function usarVolver(porDefecto: DestinoVolver): DestinoVolver {
  const { state } = useLocation();
  const guardado = (state ?? null) as { volverA?: string; volverEtiqueta?: string } | null;

  if (guardado?.volverA && guardado.volverEtiqueta) {
    return { a: guardado.volverA, etiqueta: guardado.volverEtiqueta };
  }
  return porDefecto;
}

/**
 * Lo que un enlace pone en `state` para que el detalle sepa volver.
 *
 * Se usa asi:  <Link to={...} state={desde('/expedientes', 'Expedientes')}>
 */
export function desde(ruta: string, etiqueta: string) {
  return { volverA: ruta, volverEtiqueta: etiqueta };
}
