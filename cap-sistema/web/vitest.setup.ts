import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

/**
 * Cuanto espera un `findBy*` antes de rendirse.
 *
 * Es la pieza que faltaba de la decision ya tomada en `vite.config.ts`, donde
 * el limite de las PRUEBAS se subio a 20 s por esta misma razon: la ficha
 * clinica son diez secciones y doscientos campos, jsdom la dibuja mucho mas
 * despacio que un navegador, y como los archivos corren en paralelo esa carga
 * empuja al resto.
 *
 * `testTimeout` no cubre esto. Los `findBy*` tienen su PROPIO limite, de un
 * segundo por defecto, y no lo hereda de vitest. El sintoma es una prueba que
 * pasa sola y falla en la suite completa: no encuentra un elemento que si
 * termina apareciendo, solo que un poco despues. Paso al anadir el modulo de
 * farmacia — dos archivos mas compitiendo por la CPU bastaron para cruzar el
 * segundo, y la ficha empezo a fallar de forma consistente.
 *
 * Cinco segundos no esconden una prueba lenta de verdad: el limite de 20 s
 * sigue cortandola.
 */
configure({ asyncUtilTimeout: 5_000 });

/**
 * jsdom no implementa `scrollIntoView`.
 *
 * No es que devuelva algo raro: la propiedad no existe, y llamarla lanza
 * `TypeError: scrollIntoView is not a function`. Dos pantallas la usan de
 * verdad —la cola de digitalizacion al cambiar de comunidad y el indice de la
 * ficha al saltar de seccion— y en un navegador funcionan bien.
 *
 * El sintoma era enganoso. La llamada ocurre dentro del manejador de un clic,
 * asi que React la reporta como excepcion NO CAPTURADA en vez de hacer fallar
 * la prueba: las aserciones se cumplian igual, vitest marcaba todas las
 * pruebas en verde, y lo unico que delataba el problema era que el proceso
 * terminaba con codigo 1. En CI eso es rojo sin un solo test fallado.
 *
 * Se repone antes de CADA prueba, no una sola vez al cargar el archivo. Las
 * pruebas que necesitan espiar el desplazamiento sustituyen el prototipo y no
 * lo restauran, asi que sin este `beforeEach` el doble de una prueba seguiria
 * puesto en las siguientes del mismo archivo, contando llamadas que no eran
 * suyas.
 */
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
