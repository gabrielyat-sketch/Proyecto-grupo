import { useCallback, useEffect, useRef, useState } from 'react';
import { estadoInactividad, type Fase } from './inactividad';

/**
 * Cada cuanto se revisa el tiempo sin actividad.
 *
 * Un segundo es suficiente: el aviso muestra una cuenta regresiva y necesita
 * refrescarse a ese ritmo. La comprobacion en si es restar dos numeros.
 */
const INTERVALO_MS = 1_000;

/**
 * Eventos que cuentan como actividad.
 *
 * `mousemove` incluido a proposito: alguien leyendo un expediente largo puede
 * pasar minutos sin teclear ni hacer clic, y cerrarle la sesion mientras lee
 * seria absurdo. Mover el raton al leer es involuntario y suficiente senal de
 * que la persona sigue ahi.
 */
const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

export interface CierrePorInactividad {
  fase: Fase;
  segundosRestantes: number;
  /** Reinicia la cuenta. Lo llama el boton "Continuar trabajando" del aviso. */
  continuar: () => void;
}

export function usarCierrePorInactividad(alExpirar: () => void): CierrePorInactividad {
  const ultimaActividad = useRef(Date.now());
  const [{ fase, segundosRestantes }, setEstado] = useState(() => estadoInactividad(0));

  // En una ref para que el efecto no se rearme —ni se reinicie la cuenta— cada
  // vez que quien nos usa vuelva a crear la funcion.
  const expirar = useRef(alExpirar);
  expirar.current = alExpirar;

  const continuar = useCallback(() => {
    ultimaActividad.current = Date.now();
    setEstado(estadoInactividad(0));
  }, []);

  useEffect(() => {
    // Solo asigna a una ref: no provoca re-render, asi que registrar mousemove
    // no cuesta nada aunque se dispare cientos de veces por minuto.
    const marcar = () => {
      ultimaActividad.current = Date.now();
    };
    for (const evento of EVENTOS) {
      window.addEventListener(evento, marcar, { passive: true });
    }

    const reloj = window.setInterval(() => {
      const nuevo = estadoInactividad(Date.now() - ultimaActividad.current);
      // Solo re-renderiza cuando algo cambia de verdad; en fase 'activo' el
      // segundero no importa y no vale la pena pintar cada segundo.
      setEstado((anterior) => {
        if (anterior.fase === nuevo.fase && nuevo.fase === 'activo') return anterior;
        if (anterior.fase === nuevo.fase && anterior.segundosRestantes === nuevo.segundosRestantes) {
          return anterior;
        }
        return nuevo;
      });
      if (nuevo.fase === 'expirado') expirar.current();
    }, INTERVALO_MS);

    return () => {
      for (const evento of EVENTOS) window.removeEventListener(evento, marcar);
      window.clearInterval(reloj);
    };
  }, []);

  return { fase, segundosRestantes, continuar };
}
