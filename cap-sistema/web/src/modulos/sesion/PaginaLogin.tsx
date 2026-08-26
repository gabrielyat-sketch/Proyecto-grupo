import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { MarcoAcceso } from '../../componentes/MarcoAcceso';
import { PasoCredenciales } from './PasoCredenciales';
import { PasoCodigo } from './PasoCodigo';
import { PasoConfigurarMfa } from './PasoConfigurarMfa';
import type { ResultadoEntrada } from './servicio-sesion';

type Paso =
  | { nombre: 'credenciales' }
  | { nombre: 'codigo'; tokenParcial: string }
  | { nombre: 'configurar-mfa'; tokenParcial: string };

const TEXTOS: Record<Paso['nombre'], { titulo: string; descripcion: string }> = {
  credenciales: {
    titulo: 'Iniciar sesion',
    descripcion: 'Ingrese con la cuenta que le entrego el administrador del CAP.',
  },
  codigo: {
    titulo: 'Verificacion en dos pasos',
    descripcion: 'Su rol requiere un codigo de su aplicacion de autenticacion.',
  },
  'configurar-mfa': {
    titulo: 'Configure su segundo factor',
    descripcion: 'Su rol lo requiere. Solo hay que hacerlo esta vez.',
  },
};

export function PaginaLogin() {
  const [paso, setPaso] = useState<Paso>({ nombre: 'credenciales' });
  const navegar = useNavigate();
  // Aviso que dejo la pantalla anterior; por ejemplo, tras cambiar la
  // contrasena, que cierra la sesion y devuelve aqui.
  const { state } = useLocation() as { state?: { aviso?: string } };
  const aviso = paso.nombre === 'credenciales' ? state?.aviso : undefined;

  const entrar = () => navegar('/', { replace: true });

  function avanzar(resultado: ResultadoEntrada) {
    if (resultado.tipo === 'sesion') return entrar();
    setPaso(
      resultado.tipo === 'pide-codigo'
        ? { nombre: 'codigo', tokenParcial: resultado.tokenParcial }
        : { nombre: 'configurar-mfa', tokenParcial: resultado.tokenParcial },
    );
  }

  const volver = () => setPaso({ nombre: 'credenciales' });
  const { titulo, descripcion } = TEXTOS[paso.nombre];

  return (
    <MarcoAcceso titulo={titulo} descripcion={descripcion}>
      {aviso ? <Alert severity="success">{aviso}</Alert> : null}
      {paso.nombre === 'credenciales' ? <PasoCredenciales alAvanzar={avanzar} /> : null}
      {paso.nombre === 'codigo' ? (
        <PasoCodigo tokenParcial={paso.tokenParcial} alVolver={volver} alEntrar={entrar} />
      ) : null}
      {paso.nombre === 'configurar-mfa' ? (
        <PasoConfigurarMfa tokenParcial={paso.tokenParcial} alVolver={volver} alEntrar={entrar} />
      ) : null}
    </MarcoAcceso>
  );
}
