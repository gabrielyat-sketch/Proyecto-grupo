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
import { PaginaFicha } from './modulos/fichas/PaginaFicha';
import { PaginaFichaNeonato } from './modulos/fichas/neonato/PaginaFichaNeonato';
import { PaginaDigitalizacion } from './modulos/digitalizacion/PaginaDigitalizacion';
import { PaginaSalaEspera } from './modulos/espera/PaginaSalaEspera';
import { PaginaExpedientes } from './modulos/expedientes/PaginaExpedientes';
import { PaginaExpediente } from './modulos/expedientes/PaginaExpediente';
import { PaginaFarmacia } from './modulos/farmacia/PaginaFarmacia';
import { PaginaMedicamento } from './modulos/farmacia/PaginaMedicamento';
import { PaginaEntrega } from './modulos/farmacia/PaginaEntrega';
import { PaginaAdministracion } from './modulos/administracion/PaginaAdministracion';
import { MENU } from './navegacion/menu';

/**
 * Un solo cliente para toda la aplicacion. Se crea fuera del componente a proposito:
 * dentro, cada re-render lo recrearia y la cache se perderia en cada pulsacion.
 *
 * Se exporta para poder vaciarlo entre pruebas. Al ser de modulo, sobrevive al
 * desmontaje del arbol: sin vaciarlo, una prueba lee los datos guardados por la
 * anterior y falla por un motivo que no tiene que ver con lo que estaba
 * comprobando.
 */
export const clienteConsultas = new QueryClient({
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
                  <RutaPorRol ruta="/recepcion/nuevo">
                    <PaginaNuevoPaciente />
                  </RutaPorRol>
                }
              />
              <Route
                path="/expedientes"
                element={
                  <RutaPorRol ruta="/expedientes">
                    <PaginaExpedientes />
                  </RutaPorRol>
                }
              />
              <Route
                path="/pacientes/:pacienteId/expediente"
                element={
                  <RutaPorRol ruta="/expediente">
                    <PaginaExpediente />
                  </RutaPorRol>
                }
              />

              <Route
                path="/espera"
                element={
                  <RutaPorRol ruta="/espera">
                    <PaginaSalaEspera />
                  </RutaPorRol>
                }
              />

              <Route
                path="/farmacia"
                element={
                  <RutaPorRol ruta="/farmacia">
                    <PaginaFarmacia />
                  </RutaPorRol>
                }
              />
              {/*
                El despacho va ANTES de /farmacia/:medicamentoId: la ruta
                declarada primero gana, y si no, "entrega" se leeria como el id
                de un medicamento.
              */}
              <Route
                path="/farmacia/entrega"
                element={
                  <RutaPorRol ruta="/farmacia/entrega">
                    <PaginaEntrega />
                  </RutaPorRol>
                }
              />
              {/*
                El detalle de un medicamento no esta en el menu: se llega a el
                desde el catalogo, con el medicamento ya elegido.
              */}
              <Route
                path="/farmacia/:medicamentoId"
                element={
                  <RutaPorRol ruta="/farmacia/medicamento">
                    <PaginaMedicamento />
                  </RutaPorRol>
                }
              />

              <Route
                path="/digitalizacion"
                element={
                  <RutaPorRol ruta="/digitalizacion">
                    <PaginaDigitalizacion />
                  </RutaPorRol>
                }
              />

              {/*
                La ficha no esta en el menu: se llega a ella con un paciente ya
                elegido, desde la busqueda. La guarda es la misma de siempre.
              */}
              <Route
                path="/pacientes/:pacienteId/ficha"
                element={
                  <RutaPorRol ruta="/ficha">
                    <PaginaFicha />
                  </RutaPorRol>
                }
              />
              <Route
                path="/pacientes/:pacienteId/ficha-neonato"
                element={
                  <RutaPorRol ruta="/ficha-neonato">
                    <PaginaFichaNeonato />
                  </RutaPorRol>
                }
              />
              {/*
                Las rutas salen del mismo menu que dibuja la navegacion: no
                puede haber una opcion sin pantalla ni una pantalla que el rol
                no tenga permitida.
              */}
              <Route
                path="/administracion"
                element={
                  <RutaPorRol ruta="/administracion">
                    <PaginaAdministracion />
                  </RutaPorRol>
                }
              />

              {MENU.filter((m) => m.ruta !== '/recepcion' &&
                m.ruta !== '/digitalizacion' &&
                m.ruta !== '/espera' &&
                m.ruta !== '/farmacia' &&
                m.ruta !== '/administracion' &&
                m.ruta !== '/expedientes').map(({ ruta, etiqueta, descripcion }) => (
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
