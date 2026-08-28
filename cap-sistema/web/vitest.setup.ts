import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

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
