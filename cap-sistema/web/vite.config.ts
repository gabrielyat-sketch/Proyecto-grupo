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
    watch: {
      /**
       * Espera a que el archivo termine de escribirse antes de procesarlo.
       *
       * Guardar un archivo no es instantaneo: primero se vacia y luego se
       * escribe el contenido. Si el vigilante lo lee en ese hueco, se queda
       * con una version VACIA en cache y no vuelve a invalidarla. El sintoma
       * es una pantalla en blanco con "does not provide an export named X",
       * mientras el archivo en disco esta perfecto, asi que se busca el
       * problema donde no esta.
       */
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
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
    /**
     * Mas margen que los 5 s por defecto.
     *
     * No es lentitud del panel. La ficha clinica son diez secciones y
     * doscientos campos, y jsdom la dibuja mucho mas despacio que un navegador;
     * escribir en un campo la vuelve a dibujar en cada letra. Como los archivos
     * de prueba corren en paralelo, esa carga empujaba por encima del limite a
     * pruebas de otras pantallas que no tenian nada que ver, y fallaban de
     * forma intermitente segun que mas estuviera corriendo en la maquina.
     *
     * El limite sigue existiendo: una prueba de verdad colgada falla igual,
     * solo que mas tarde.
     */
    testTimeout: 20_000,
  },
});
