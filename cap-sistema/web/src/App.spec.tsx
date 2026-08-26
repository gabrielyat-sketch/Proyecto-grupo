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
    expect(screen.getByLabelText(/Contrasena/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: /Sesion abierta/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('jlopez')).toBeInTheDocument();
    expect(screen.getByText('RECEPCION')).toBeInTheDocument();
  });
});
