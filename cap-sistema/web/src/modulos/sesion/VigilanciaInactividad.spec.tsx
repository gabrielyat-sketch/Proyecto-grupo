import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VigilanciaInactividad } from './VigilanciaInactividad';
import { almacenSesion, type Perfil } from '../../api';
import { AVISO_MS, LIMITE_MS } from './inactividad';

const USUARIO: Perfil = {
  id: 'u-1',
  usuario: 'jlopez',
  rol: 'RECEPCION',
  debeCambiarContrasena: false,
};

function montar() {
  return render(
    <MemoryRouter>
      <VigilanciaInactividad />
    </MemoryRouter>,
  );
}

/** Avanza el reloj simulado, dejando que los intervalos se disparen. */
async function avanzar(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

const avisoVisible = () => screen.queryByText(/Su sesion esta por cerrarse/i) !== null;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  almacenSesion.limpiar();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('cierre por inactividad', () => {
  it('sin sesion no vigila nada', async () => {
    montar();
    await avanzar(LIMITE_MS + 5_000);
    expect(avisoVisible()).toBe(false);
  });

  it('con sesion, a los 14 minutos aparece el aviso con la cuenta regresiva', async () => {
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: USUARIO });
    montar();

    await avanzar(LIMITE_MS - AVISO_MS - 2_000);
    expect(avisoVisible()).toBe(false);

    await avanzar(3_000);
    expect(avisoVisible()).toBe(true);
    expect(screen.getByText(/segundos/i)).toBeInTheDocument();
  });

  it('al cumplirse el limite la sesion se cierra', async () => {
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: USUARIO });
    montar();

    await avanzar(LIMITE_MS + 1_000);

    expect(almacenSesion.autenticado).toBe(false);
  });

  it('"Continuar trabajando" reinicia la cuenta y quita el aviso', async () => {
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: USUARIO });
    montar();

    await avanzar(LIMITE_MS - 30_000);
    expect(avisoVisible()).toBe(true);

    await act(async () => {
      screen.getByRole('button', { name: /Continuar trabajando/i }).click();
    });
    // El dialogo de MUI tiene animacion de salida: sigue en el DOM un instante.
    await avanzar(500);
    expect(avisoVisible()).toBe(false);

    // La cuenta empezo de cero: pasado el tiempo que faltaba, sigue abierta.
    await avanzar(60_000);
    expect(almacenSesion.autenticado).toBe(true);
  });

  it('escribir reinicia la cuenta: nadie pierde la sesion mientras trabaja', async () => {
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: USUARIO });
    montar();

    await avanzar(LIMITE_MS - 60_000);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    // Dos segundos: el vigilante revisa una vez por segundo, asi que con menos
    // de un ciclo el estado ni siquiera se recalcula.
    await avanzar(2_000);

    // 13 minutos desde la tecla: la cuenta arranco de cero, asi que ni siquiera
    // se llega al aviso, que empieza a los 14.
    await avanzar(LIMITE_MS - 120_000);
    expect(almacenSesion.autenticado).toBe(true);
    expect(avisoVisible()).toBe(false);
  });

  it('mover el raton tambien cuenta: leer un expediente no debe cerrar la sesion', async () => {
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: USUARIO });
    montar();

    await avanzar(LIMITE_MS - 60_000);
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    await avanzar(120_000);
    expect(almacenSesion.autenticado).toBe(true);
  });

  it('"Cerrar sesion ahora" no espera a que termine la cuenta', async () => {
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: USUARIO });
    montar();

    await avanzar(LIMITE_MS - 30_000);
    await act(async () => {
      screen.getByRole('button', { name: /Cerrar sesion ahora/i }).click();
    });

    expect(almacenSesion.autenticado).toBe(false);
  });
});
