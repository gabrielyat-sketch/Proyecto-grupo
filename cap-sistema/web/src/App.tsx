import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { tema } from './tema';
import { Layout } from './componentes/Layout';
import { PaginaLogin } from './modulos/sesion/PaginaLogin';
import { PaginaCambiarContrasena } from './modulos/sesion/PaginaCambiarContrasena';
import { VigilanciaInactividad } from './modulos/sesion/VigilanciaInactividad';
import { RutaProtegida } from './rutas/RutaProtegida';
import { RutaPorRol } from './rutas/RutaPorRol';
import { Inicio } from './rutas/Inicio';
import { EnConstruccion } from './rutas/EnConstruccion';
import { PaginaRecepcion } from './modulos/recepcion/PaginaRecepcion';
import { PaginaNuevoPaciente } from './modulos/recepcion/PaginaNuevoPaciente';
import { MENU } from './navegacion/menu';

/**
 * Un solo cliente para toda la aplicacion. Se crea fuera del componente a proposito:
 * dentro, cada re-render lo recrearia y la cache se perderia en cada pulsacion.
 */
const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      // El expediente de un paciente no cambia mientras el operador lo mira.
      staleTime: 30_000,
      // La red del CAP es intermitente; un reintento ayuda, tres esconden la falla.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <ThemeProvider theme={tema}>
        <CssBaseline />
        <BrowserRouter>
          {/*
            Fuera de <Routes> a proposito: montado una sola vez, la cuenta
            no se reinicia al cambiar de pantalla. Dentro, bastaria con
            navegar una vez para dejar el panel abierto toda la tarde.
          */}
          <VigilanciaInactividad />
          <Routes>
            <Route path="/acceso" element={<PaginaLogin />} />

            {/*
              Protegida —hace falta sesion para cambiar la propia contrasena—
              pero fuera del layout: cuando el cambio es obligatorio, el panel
              no debe llegar a dibujarse.
            */}
            <Route
              path="/contrasena"
              element={
                <RutaProtegida>
                  <PaginaCambiarContrasena />
                </RutaProtegida>
              }
            />

            <Route
              element={
                <RutaProtegida>
                  <Layout />
                </RutaProtegida>
              }
            >
              <Route index element={<Inicio />} />

              {/*
                Recepcion tiene pantallas propias, asi que va antes del mapeo
                de modulos pendientes: la ruta declarada primero gana.
              */}
              <Route
                path="/recepcion"
                element={
                  <RutaPorRol ruta="/recepcion">
                    <PaginaRecepcion />
                  </RutaPorRol>
                }
              />
              <Route
                path="/recepcion/nuevo"
                element={
                  <RutaPorRol ruta="/recepcion">
                    <PaginaNuevoPaciente />
                  </RutaPorRol>
                }
              />
              {/*
                Las rutas salen del mismo menu que dibuja la navegacion: no
                puede haber una opcion sin pantalla ni una pantalla que el rol
                no tenga permitida.
              */}
              {MENU.filter((m) => m.ruta !== '/recepcion').map(({ ruta, etiqueta, descripcion }) => (
                <Route
                  key={ruta}
                  path={ruta}
                  element={
                    <RutaPorRol ruta={ruta}>
                      <EnConstruccion titulo={etiqueta} descripcion={descripcion} />
                    </RutaPorRol>
                  }
                />
              ))}
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
