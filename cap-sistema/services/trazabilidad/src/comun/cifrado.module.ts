import { Global, Module } from '@nestjs/common';
import { ServicioCifrado } from '@cap/shared';
import { ENTORNO, Entorno, leerEntorno } from '../config/entorno';

export const SERVICIO_CIFRADO = 'SERVICIO_CIFRADO';

/**
 * Cifrado de los valores clinicos que viajan en la bitacora.
 *
 * LLAVE_DATOS y LLAVE_INDICE deben ser las mismas en todos los servicios: si
 * difieren, un valor cifrado aqui no lo puede leer nadie mas y el dato queda
 * inaccesible sin haber dado un solo error.
 */
@Global()
@Module({
  providers: [
    { provide: ENTORNO, useFactory: leerEntorno },
    {
      provide: SERVICIO_CIFRADO,
      inject: [ENTORNO],
      useFactory: (env: Entorno) => new ServicioCifrado(env.LLAVE_DATOS, env.LLAVE_INDICE),
    },
  ],
  exports: [ENTORNO, SERVICIO_CIFRADO],
})
export class CifradoModule {}
