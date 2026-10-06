import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { almacenSesion } from './api';

beforeEach(() => {
  almacenSesion.limpiar();
  window.history.pushState({}, '', '/');
});

describe('acceso a la aplicacion', () => {
  it('sin sesion, la raiz lleva a la pantalla de entrada', async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Iniciar sesion/i })).toBeInTheDocument(),
    );
    expect(window.location.pathname).toBe('/acceso');
  });

  it('la pantalla de entrada pide usuario y contrasena', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument());
    // Texto exacto: el boton del ojo se anuncia como 'Mostrar la contrasena'
    // y una busqueda por coincidencia parcial encontraria los dos.
    expect(screen.getByLabelText('Contrasena')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('la pantalla de entrada nombra a los integrantes del proyecto', async () => {
    render(<App />);

    const lista = await screen.findByRole('list', { name: /Integrantes del proyecto/i });
    expect(lista).toHaveTextContent('Dennis Alessandro Xona Isem');
    expect(lista).toHaveTextContent('Zulma Romineya López Ac');
    expect(lista).toHaveTextContent('Ramiro Gabriel Yat Yat');
  });

  it('las politicas de privacidad se abren sin sesion, desde el login', async () => {
    render(<App />);

    const enlace = await screen.findByRole('link', { name: /Políticas de privacidad/i });
    expect(enlace).toHaveAttribute('href', '/privacidad');

    window.history.pushState({}, '', '/privacidad');
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /Políticas de privacidad/i }),
    ).toBeInTheDocument();
    // Publica: no la manda al login.
    expect(window.location.pathname).toBe('/privacidad');
  });

  it('el foco entra solo al campo de usuario: se escribe sin tocar el mouse', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByLabelText(/Usuario/i)).toHaveFocus());
  });

  it('una ruta inexistente no deja al usuario en blanco', async () => {
    window.history.pushState({}, '', '/ruta-que-no-existe');
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Iniciar sesion/i })).toBeInTheDocument(),
    );
  });

  it('con sesion abierta, la raiz muestra el panel y no el login', async () => {
    almacenSesion.guardar({
      tokenAcceso: 'token',
      tokenRefresco: 'refresco',
      usuario: { id: 'u-1', usuario: 'jlopez', rol: 'RECEPCION', debeCambiarContrasena: false },
    });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Buen dia, jlopez/i })).toBeInTheDocument(),
    );
    // El inicio lista los modulos del rol, no el login.
    expect(screen.getByText(/modulos disponibles para su rol/i)).toBeInTheDocument();
  });
});
