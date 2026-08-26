export { apiAuth, apiAuthPublico, apiMedicamentos, apiProgramas, apiUsuarios } from './clientes';
export { ErrorApi, errorDeRed, esErrorApi } from './errores';
export type { CodigoError, CuerpoError, RespuestaError } from './errores';
export { almacenSesion } from './sesion-almacen';
export type { Perfil } from './sesion-almacen';
export { estaVigente, expiraEn } from './token';
