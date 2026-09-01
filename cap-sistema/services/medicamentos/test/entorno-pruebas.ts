// Carga el .env del servicio antes de que arranque la aplicacion en las
// pruebas e2e. Sin esto, leerEntorno() falla y el modulo no se compila.
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '..', '.env') });
