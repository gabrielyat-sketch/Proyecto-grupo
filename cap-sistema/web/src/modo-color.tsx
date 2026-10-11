import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { crearTema, type ModoColor } from './tema';

/**
 * Claro, oscuro, o lo que diga el sistema.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE TRES Y NO DOS
 * ─────────────────────────────────────────────────────────────────────────
 * «Sistema» no es un adorno de la lista: en el CAP las computadoras se
 * comparten entre turnos y Windows ya cambia solo a oscuro por la tarde.
 * Quien entra de noche no deberia tener que acordarse de cambiarlo, y quien
 * entra de dia no deberia encontrarse la pantalla que dejo el turno anterior.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE EN `localStorage` Y NO EN LA CUENTA
 * ─────────────────────────────────────────────────────────────────────────
 * Es una preferencia del PUESTO, no de la persona. La pantalla de recepcion
 * esta junto a una ventana y la de farmacia al fondo del pasillo: la misma
 * enfermera puede quererlo distinto en cada una. Guardarlo en el perfil le
 * arrastraria a la segunda maquina una eleccion que hizo por la luz de la
 * primera.
 */
const CLAVE = 'cap.modo-color';

const ES_MODO = (v: unknown): v is ModoColor =>
  v === 'claro' || v === 'oscuro' || v === 'sistema';

function leerModo(): ModoColor {
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    return ES_MODO(guardado) ? guardado : 'sistema';
  } catch {
    // Modo privado o almacenamiento bloqueado. Seguir el sistema es la opcion
    // que acierta sin preguntar, asi que es la que vale cuando no hay memoria.
    return 'sistema';
  }
}

/** Lo que el sistema operativo pide ahora mismo. */
function prefiereOscuro(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    // jsdom y los navegadores muy viejos no traen matchMedia. Claro es el
    // valor seguro: es el que funciona aunque el tema no llegue a aplicarse.
    return false;
  }
}

interface Contexto {
  /** Lo que la persona eligio: puede ser «sistema». */
  modo: ModoColor;
  /** Lo que se esta pintando: «sistema» ya resuelto. */
  efectivo: 'claro' | 'oscuro';
  cambiar: (modo: ModoColor) => void;
}

const ContextoModo = createContext<Contexto>({
  modo: 'sistema',
  efectivo: 'claro',
  cambiar: () => {},
});

export const usarModoColor = () => useContext(ContextoModo);

export function ProveedorModoColor({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<ModoColor>(leerModo);
  const [sistemaOscuro, setSistemaOscuro] = useState(prefiereOscuro);

  /*
    Se escucha al sistema SIEMPRE, no solo cuando el modo es «sistema».

    Cuesta una escucha y evita un fallo que solo aparece al cambiar de
    preferencia: si se suscribiera condicionalmente, pasar de «claro» a
    «sistema» dejaria el valor congelado en el que habia al montar hasta que
    el sistema volviera a cambiar.
  */
  useEffect(() => {
    let media: MediaQueryList;
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const alCambiar = (e: MediaQueryListEvent) => setSistemaOscuro(e.matches);
    media.addEventListener('change', alCambiar);
    return () => media.removeEventListener('change', alCambiar);
  }, []);

  const cambiar = useCallback((nuevo: ModoColor) => {
    setModo(nuevo);
    try {
      window.localStorage.setItem(CLAVE, nuevo);
    } catch {
      // Si no se puede guardar, la eleccion dura lo que dure la pestana. Peor
      // eso que caerse al pulsar el control del tema.
    }
  }, []);

  const efectivo: 'claro' | 'oscuro' =
    modo === 'sistema' ? (sistemaOscuro ? 'oscuro' : 'claro') : modo;

  // El tema se reconstruye solo cuando el modo EFECTIVO cambia. Sin esto se
  // rehace en cada render del panel, y con el se rehacen tambien todos los
  // estilos que MUI memoriza a partir de el.
  const temaActual = useMemo(() => crearTema(efectivo), [efectivo]);
  const valor = useMemo(() => ({ modo, efectivo, cambiar }), [modo, efectivo, cambiar]);

  return (
    <ContextoModo.Provider value={valor}>
      <ThemeProvider theme={temaActual}>{children}</ThemeProvider>
    </ContextoModo.Provider>
  );
}
