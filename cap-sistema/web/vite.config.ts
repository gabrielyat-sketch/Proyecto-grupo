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

    /**
     * Cuantos archivos de prueba corren a la vez.
     *
     * Vitest usa por omision casi un trabajador por nucleo —aqui son
     * dieciseis— y en esta suite eso es contraproducente: la ficha clinica
     * dibuja doscientos campos en jsdom, el carnet de ninez una tabla de diez
     * vacunas por cinco dosis, y farmacia otras tantas. Con doce de esos
     * archivos compitiendo, cada uno tarda mas que si corrieran de seis en
     * seis, y las esperas de `findBy*` empiezan a agotarse en pruebas que no
     * tienen ningun problema.
     *
     * El sintoma es inconfundible y ya aparecio tres veces: decenas de fallos
     * repartidos por archivos sin relacion, TODOS pasando en aislamiento, y
     * duraciones por archivo que se disparan de sesenta segundos a trescientos.
     *
     * Cuanto se mueve esta suite sola: el MISMO archivo, sin tocar una linea,
     * midio 39,5 s y 22,7 s en dos pasadas seguidas. Un 74 % de diferencia por
     * la cache del disco. Con ese margen, cualquier comparacion de una sola
     * pasada dice lo que uno quiera oir; hace falta medir la misma version dos
     * veces antes de creerle a la comparacion.
     *
     * Aqui se perdio tiempo con la opcion equivocada. `poolOptions.threads.
     * maxThreads` es de Vitest 2 y 3; en la 4 se cambio por `maxWorkers`, y
     * como sobra en el objeto de configuracion, vitest la ignoro sin decir
     * nada. Lo unico que la delataba era `tsc`: "'poolOptions' does not exist
     * in type 'InlineConfig'". Si esta linea deja de surtir efecto tras una
     * actualizacion, ese error de tipos es donde mirar.
     */
    maxWorkers: 6,
  },
});
