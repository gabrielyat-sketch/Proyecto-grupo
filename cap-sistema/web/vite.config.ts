import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * En desarrollo el panel corre en 5173 y cada microservicio en su propio puerto.
 * El proxy hace que el navegador vea un solo origen: sin CORS y sin URLs absolutas
 * regadas por el codigo. En produccion el gateway de nginx cumple este mismo papel,
 * asi que el frontend no cambia al desplegarse.
 */
const servicios = {
  '/api/auth': 'http://localhost:3001',
  '/api/usuarios': 'http://localhost:3002',
  '/api/programas': 'http://localhost:3003',
  '/api/medicamentos': 'http://localhost:3004',
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      Object.entries(servicios).map(([prefijo, destino]) => [
        prefijo,
        {
          target: destino,
          changeOrigin: true,
          rewrite: (ruta: string) => ruta.replace(prefijo, ''),
        },
      ]),
    ),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
