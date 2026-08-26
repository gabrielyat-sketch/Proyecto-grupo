import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { tema } from './tema';
import { PaginaLogin } from './modulos/sesion/PaginaLogin';
import { RutaProtegida } from './rutas/RutaProtegida';
import { Inicio } from './rutas/Inicio';

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
          <Routes>
            <Route path="/acceso" element={<PaginaLogin />} />
            <Route
              path="/"
              element={
                <RutaProtegida>
                  <Inicio />
                </RutaProtegida>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
