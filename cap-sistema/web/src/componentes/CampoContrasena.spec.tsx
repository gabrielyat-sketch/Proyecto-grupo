import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampoContrasena } from './CampoContrasena';

const campo = () => screen.getByLabelText('Contrasena') as HTMLInputElement;
const boton = () => screen.getByRole('button');

describe('CampoContrasena', () => {
  it('empieza oculta: las computadoras del CAP estan a la vista del publico', () => {
    render(<CampoContrasena label="Contrasena" />);
    expect(campo().type).toBe('password');
    expect(boton()).toHaveAccessibleName('Mostrar la contrasena');
  });

  it('al pulsar el icono se muestra, y al pulsarlo otra vez se vuelve a ocultar', async () => {
    render(<CampoContrasena label="Contrasena" />);

    await userEvent.click(boton());
    expect(campo().type).toBe('text');
    expect(boton()).toHaveAccessibleName('Ocultar la contrasena');

    await userEvent.click(boton());
    expect(campo().type).toBe('password');
  });

  it('mostrarla no borra lo escrito', async () => {
    render(<CampoContrasena label="Contrasena" />);

    await userEvent.type(campo(), 'Clave-Purulha-2026');
    await userEvent.click(boton());

    expect(campo()).toHaveValue('Clave-Purulha-2026');
  });

  it('el boton NO envia el formulario al pulsarlo', async () => {
    // Un boton dentro de un form es submit por defecto: sin type="button",
    // mirar la contrasena intentaria entrar con lo que hubiera escrito.
    const enviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={enviar}>
        <CampoContrasena label="Contrasena" />
      </form>,
    );

    await userEvent.click(boton());

    expect(enviar).not.toHaveBeenCalled();
  });
});
