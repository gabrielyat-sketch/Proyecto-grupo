import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

/*
  La letra del sistema, servida desde el propio servidor.

  El tema pedia Inter desde el principio, pero nadie la cargaba nunca: el
  navegador no la encontraba y caia en Segoe UI, la de Windows. De ahi que todo
  se viera «comun» —y de ahi tambien que `fontFeatureSettings` no hiciera nada,
  porque las variantes que distinguen el 1 del l y de la I son de Inter.

  Va instalada en el proyecto y no traida de Google. El CAP esta en Purulha y
  la conexion se cae; una hoja de estilo que hay que ir a buscar a internet
  significa que el dia que no haya red el sistema se vea distinto, justo el dia
  en que menos conviene que nada se vea raro.

  Cuatro pesos y SOLO el juego latino. Los pesos son los que el tema usa:
  normal para leer, 500 y 600 para los titulos y las filas activas, 700 para
  los encabezados. `400.css` habria traido ademas el latino extendido, el
  griego y el cirilico —el doble de archivos por cada peso— y en el CAP no se
  escribe en ninguno de los tres; `latin-400.css` deja fuera lo que no se va a
  dibujar nunca. El acento y la enie estan en el latino de siempre.
*/
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
